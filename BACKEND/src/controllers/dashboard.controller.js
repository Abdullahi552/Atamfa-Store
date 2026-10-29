import * as dashboardService from '../services/dashboard.service.js';
import catchAsync from '../utils/catchAsync.js';

export const getDashboard = catchAsync(async (req, res) => {
    const data = await dashboardService.getDashboardData();
    res.status(200).json(data);
});