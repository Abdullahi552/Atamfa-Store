import express from 'express';
import * as reportController from '../controllers/report.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/daily', reportController.daily);
router.get('/bestsellers', reportController.bestsellers);
router.get('/inventory', reportController.inventory);

export default router;