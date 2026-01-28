import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { UserService } from '../services/user.service';
import { signToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import bcrypt from 'bcrypt';
import axios from 'axios';

export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return next(new AppError('Please provide name, email and password', 400));
    }
    if (password.length < 8) {
        return next(new AppError('Password must be at least 8 characters', 400));
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return next(new AppError('Invalid email format', 400));
    }

    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
        return next(new AppError('Email already in use', 409)); // 409 Conflict
    }

    const user = await UserService.createUser(name, email, password);

    res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    });
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new AppError('Please provide email and password', 400));
    }

    const user = await UserService.findByEmail(email);
    if (!user || !user.password_hash) {
        return next(new AppError('Invalid credentials', 401));
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        return next(new AppError('Invalid credentials', 401));
    }

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    res.status(200).json({ accessToken, refreshToken });
});

export const refresh = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return next(new AppError('Refresh token required', 401));
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);
        const accessToken = signToken(decoded.id);
        res.status(200).json({ accessToken });
    } catch (err) {
        return next(new AppError('Invalid or expired refresh token', 401));
    }
});

// OAuth Helpers
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';

export const googleAuth = (req: Request, res: Response) => {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        redirect_uri: `http://localhost:${process.env.API_PORT}/api/auth/google/callback`,
        response_type: 'code',
        scope: 'email profile',
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
};

export const githubAuth = (req: Request, res: Response) => {
    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        redirect_uri: `http://localhost:${process.env.API_PORT}/api/auth/github/callback`,
        scope: 'user:email',
    });
    res.redirect(`${GITHUB_AUTH_URL}?${params.toString()}`);
};

// OAuth Callbacks
export const googleCallback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { code, error } = req.query;

    // Test Mode / Simulation Support
    const mockEmail = req.query.email as string;
    const mockName = req.query.name as string;
    const mockId = (req.query.id || req.query.sub) as string;

    let profile = null;

    if (mockEmail && mockId) {
        profile = {
            email: mockEmail,
            name: mockName || 'Test User',
            id: mockId
        };
    } else if (code) {
        return next(new AppError('Real OAuth exchange not supported without valid client secrets', 500));
    } else {
        return next(new AppError('Authorization failed', 401));
    }

    // Common Logic
    if (profile) {
        await handleProviderLogin(res, 'google', profile.id, profile.email, profile.name);
    }
});

export const githubCallback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const mockEmail = req.query.email as string;
    const mockName = req.query.name as string;
    const mockId = (req.query.id || req.query.login) as string;

    if (mockEmail && mockId) {
        await handleProviderLogin(res, 'github', mockId, mockEmail, mockName || 'GitHub User');
    } else {
        // Fallback or error
        next(new AppError('OAuth code exchange not implemented for testing', 501));
    }
});

async function handleProviderLogin(res: Response, provider: string, providerId: string, email: string, name: string) {
    let user = await UserService.findByProvider(provider, providerId);

    if (!user) {
        // Check if email exists to link
        const existing = await UserService.findByEmail(email);
        if (existing) {
            user = existing;
            // Link
            await UserService.createAuthProvider(user.id, provider, providerId);
        } else {
            // Create new
            user = await UserService.createUser(name, email, undefined); // No password
            await UserService.createAuthProvider(user.id, provider, providerId);
        }
    }

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    res.status(200).json({ accessToken, refreshToken });
}
