import express from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/', notificationController.getNotifications);
router.post('/read-all', notificationController.markRead);

export default router;