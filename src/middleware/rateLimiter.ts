import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';
import { AppError } from '../utils/AppError';

export const rateLimiter = (limit: number, windowSeconds: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const ip = req.ip || req.socket.remoteAddress;
            const key = `rate_limit:${ip}:${req.originalUrl}`;

            const requests = await redisClient.incr(key);

            if (requests === 1) {
                await redisClient.expire(key, windowSeconds);
            }

            const ttl = await redisClient.ttl(key);

            res.setHeader('X-RateLimit-Limit', limit);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - requests));
            res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

            if (requests > limit) {
                return next(new AppError('Too many requests, please try again later.', 429));
            }

            next();
        } catch (err) {
            console.error('Rate Limiter Error:', err);
            next();
        }
    };
};
