import express from 'express';
import * as cashierController from '../controllers/cashier.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/', cashierController.getCashiers);
router.post('/', cashierController.createCashier);
router.put('/:id', cashierController.updateCashier);
router.delete('/:id', cashierController.deleteCashier);
router.post('/:id/reset-password', cashierController.resetPassword);

export default router;