import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { restrictTo } from '../middleware/rbac.middleware';

const router = Router();

// Protect all routes after this middleware
router.use(protect);

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

// Admin only routes
router.get('/', restrictTo('admin'), userController.getAllUsers);

export default router;
