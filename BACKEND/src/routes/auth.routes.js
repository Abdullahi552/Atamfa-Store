import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js'; // <-- ADD THIS

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);

// Profile & Password updates
router.put('/password', protect, authController.changePassword);
router.put('/profile', protect, authController.updateProfile);

// Avatar Upload
router.post('/avatar', protect, upload.single('avatar'), authController.uploadAvatar);

export default router;