import * as productService from '../services/product.service.js';
import catchAsync from '../utils/catchAsync.js';

export const getProducts = catchAsync(async (req, res) => {
    const result = await productService.getAllProducts(req.query);
    res.status(200).json(result);
});

export const getProduct = catchAsync(async (req, res) => {
    const product = await productService.getProductById(req.params.id);
    res.status(200).json(product);
});

export const createProduct = catchAsync(async (req, res) => {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
});

export const updateProduct = catchAsync(async (req, res) => {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.status(200).json(product);
});

export const deleteProduct = catchAsync(async (req, res) => {
    await productService.deleteProduct(req.params.id);
    res.status(204).send();
});