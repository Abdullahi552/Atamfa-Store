import express from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));
router.get('/', dashboardController.getDashboard);

export default router;