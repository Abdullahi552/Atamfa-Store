import express from 'express';
import * as saleController from '../controllers/sale.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', saleController.getSales);
router.get('/:id', saleController.getSale);

router.post('/', restrictTo('cashier', 'admin'), saleController.createSale);
router.post('/:id/refund', saleController.refundSale);

export default router;