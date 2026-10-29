import * as reportService from '../services/report.service.js';
import catchAsync from '../utils/catchAsync.js';

export const daily = catchAsync(async (req, res) => {
    const data = await reportService.getDailyReport(req.query.date);
    res.status(200).json(data);
});

export const bestsellers = catchAsync(async (req, res) => {
    const data = await reportService.getBestsellers(req.query.from, req.query.to, req.query.limit);
    res.status(200).json(data);
});

export const inventory = catchAsync(async (req, res) => {
    const data = await reportService.getInventory();
    res.status(200).json(data);
});