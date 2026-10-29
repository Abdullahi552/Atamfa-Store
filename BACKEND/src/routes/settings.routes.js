import express from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js'; // <-- ADD THIS

const router = express.Router();

router.use(protect);

router.get('/', settingsController.getSettings);
router.put('/', restrictTo('admin'), settingsController.updateSettings);
router.post('/logo', restrictTo('admin'), upload.single('logo'), settingsController.uploadLogo);

export default router;