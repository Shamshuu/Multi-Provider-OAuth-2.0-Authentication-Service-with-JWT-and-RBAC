import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { UserService } from '../services/user.service';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    try {
        const decoded = verifyToken(token);

        // Check if user still exists
        const currentUser = await UserService.findById(decoded.id);
        if (!currentUser) {
            return next(new AppError('The user belonging to this token no longer does exist.', 401));
        }

        req.user = currentUser;
        next();
    } catch (err) {
        return next(new AppError('Invalid token. Please log in again!', 401));
    }
};
