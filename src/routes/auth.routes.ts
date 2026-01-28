import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate Limit: 10 requests per 60 seconds
const authLimiter = rateLimiter(10, 60);

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);

router.get('/google', authLimiter, authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

router.get('/github', authLimiter, authController.githubAuth);
router.get('/github/callback', authController.githubCallback);

export default router;
