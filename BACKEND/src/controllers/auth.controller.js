import * as authService from '../services/auth.service.js';
import catchAsync from '../utils/catchAsync.js';

export const login = catchAsync(async (req, res) => {
    const { username, password } = req.body;
    const { token, user } = await authService.loginUser(username, password);
    res.status(200).json({ token, user });
});

export const logout = catchAsync(async (req, res) => {
    await authService.logoutUser(req.user._id);
    res.status(204).send();
});

export const getMe = catchAsync(async (req, res) => {
    res.status(200).json(req.user);
});

export const changePassword = catchAsync(async (req, res) => {
    await authService.updatePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
    res.status(200).json({ message: 'Password updated' });
});

export const updateProfile = catchAsync(async (req, res) => {
    const user = await authService.updateProfile(req.user._id, req.body);
    res.status(200).json(user);
});
export const uploadAvatar = catchAsync(async (req, res) => {
    if (!req.file) throw new AppError('No file uploaded', 400);
    const avatarUrl = `/uploads/${req.file.filename}`;
    await authService.updateProfile(req.user._id, { avatarUrl });
    res.status(200).json({ avatarUrl });
});