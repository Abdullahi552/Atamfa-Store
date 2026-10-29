import express from 'express';
import * as heldCartController from '../controllers/heldCart.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect, restrictTo('cashier'));

router.get('/', heldCartController.getHeldCarts);
router.post('/', heldCartController.createHeldCart);
router.delete('/:id', heldCartController.deleteHeldCart);

export default router;