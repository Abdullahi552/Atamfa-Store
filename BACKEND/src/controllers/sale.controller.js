import * as saleService from '../services/sale.service.js';
import catchAsync from '../utils/catchAsync.js';

export const createSale = catchAsync(async (req, res) => {
    const sale = await saleService.createSale(req.user._id, req.body);
    res.status(201).json(sale);
});

export const getSales = catchAsync(async (req, res) => {
    const result = await saleService.getSales(req.query, req.user);
    res.status(200).json(result);
});

export const getSale = catchAsync(async (req, res) => {
    const sale = await saleService.getSaleById(req.params.id, req.user);
    res.status(200).json(sale);
});

export const refundSale = catchAsync(async (req, res) => {
    const sale = await saleService.refundSale(req.params.id, req.user, req.body.reason);
    res.status(200).json(sale);
});