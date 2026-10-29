import * as settingsService from '../services/settings.service.js';
import catchAsync from '../utils/catchAsync.js';

export const getSettings = catchAsync(async (req, res) => {
    const settings = await settingsService.getSettings();
    res.status(200).json(settings);
});

export const updateSettings = catchAsync(async (req, res) => {
    const settings = await settingsService.updateSettings(req.body);
    res.status(200).json(settings);
});
export const uploadLogo = catchAsync(async (req, res) => {
    if (!req.file) throw new AppError('No file uploaded', 400);
    const shopLogoUrl = `/uploads/${req.file.filename}`;
    await settingsService.updateSettings({ shopLogoUrl });
    res.status(200).json({ shopLogoUrl });
});