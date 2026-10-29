import * as cashierService from '../services/cashier.service.js';
import catchAsync from '../utils/catchAsync.js';

export const getCashiers = catchAsync(async (req, res) => {
    const cashiers = await cashierService.getAllCashiers();
    res.status(200).json({ data: cashiers });
});

export const createCashier = catchAsync(async (req, res) => {
    const cashier = await cashierService.createCashier(req.body);
    res.status(201).json(cashier);
});

export const updateCashier = catchAsync(async (req, res) => {
    const cashier = await cashierService.updateCashier(req.params.id, req.body);
    res.status(200).json(cashier);
});

export const deleteCashier = catchAsync(async (req, res) => {
    await cashierService.updateCashier(req.params.id, { active: false });
    res.status(204).send();
});

export const resetPassword = catchAsync(async (req, res) => {
    const result = await cashierService.resetPassword(req.params.id);
    res.status(200).json(result);
});