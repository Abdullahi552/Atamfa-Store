import Setting from '../models/Setting.js';
import AppError from '../utils/AppError.js';

export const getSettings = async () => {
    return await Setting.getSettings();
};

export const updateSettings = async (data) => {
    const settings = await Setting.getSettings();
    Object.assign(settings, data);
    await settings.save();
    return settings;
};