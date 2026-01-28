import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refreshSecret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRATION || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRATION || '7d';

export const signToken = (id: string) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN as any,
    });
};

export const signRefreshToken = (id: string) => {
    return jwt.sign({ id }, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN as any,
    });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, JWT_REFRESH_SECRET) as jwt.JwtPayload;
};
