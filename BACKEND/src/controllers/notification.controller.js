import * as notificationService from '../services/notification.service.js';
import catchAsync from '../utils/catchAsync.js';

export const getNotifications = catchAsync(async (req, res) => {
    const data = await notificationService.getNotifications();
    res.status(200).json({ data });
});

export const markRead = catchAsync(async (req, res) => {
    // Since we generate them dynamically, we don't actually need to save "read" state for this MVP
    res.status(204).send();
});