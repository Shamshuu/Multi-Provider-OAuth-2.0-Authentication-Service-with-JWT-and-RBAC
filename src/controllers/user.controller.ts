import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/AppError';
import { UserService } from '../services/user.service';

export const getMe = (req: Request, res: Response, next: NextFunction) => {
    // req.user is set by protect middleware
    if (!req.user) return next(new AppError('Not authenticated', 401));

    const { id, name, email, role } = req.user;
    res.status(200).json({ id, name, email, role });
};

export const updateMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Not authenticated', 401));

    const { name } = req.body;

    if (!name) {
        return next(new AppError('Please provide a name to update', 400));
    }

    const updatedUser = await UserService.updateName(req.user.id, name);

    res.status(200).json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
    });
});

export const getAllUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const users = await UserService.listAll();
    res.status(200).json(users);
});
