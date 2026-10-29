import express from 'express';
import * as productController from '../controllers/product.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);

// Admin only routes
router.post('/', restrictTo('admin'), productController.createProduct);
router.put('/:id', restrictTo('admin'), productController.updateProduct);
router.delete('/:id', restrictTo('admin'), productController.deleteProduct);

export default router;