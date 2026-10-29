import User from '../models/User.js';
import Shift from '../models/Shift.js';
import AppError from '../utils/AppError.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

export const loginUser = async (username, password) => {
    const user = await User.findOne({ username: username.toLowerCase() }).select('+password');
    
    if (!user || !(await user.matchPassword(password))) {
        throw new AppError('Invalid username or password', 401);
    }

    if (!user.active) {
        throw new AppError('Account is deactivated', 403);
    }

    const token = generateToken(user._id);

    // If cashier, open a shift if none is active
    if (user.role === 'cashier') {
        const activeShift = await Shift.findOne({ cashier: user._id, status: 'active' });
        if (!activeShift) {
            await Shift.create({ cashier: user._id });
        }
    }

    return { token, user };
};

export const logoutUser = async (userId) => {
    // Close the active shift for cashiers
    const activeShift = await Shift.findOne({ cashier: userId, status: 'active' });
    if (activeShift) {
        activeShift.logoutAt = new Date();
        activeShift.durationMinutes = Math.round((activeShift.logoutAt - activeShift.loginAt) / 60000);
        activeShift.status = 'completed';
        await activeShift.save();
    }
};

export const updatePassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findById(userId).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
        throw new AppError('Incorrect current password', 400, null, { currentPassword: 'Incorrect password' });
    }
    if (newPassword.length < 8) {
        throw new AppError('Password too short', 422, null, { newPassword: 'Must be at least 8 characters' });
    }
    user.password = newPassword;
    await user.save();
};

export const updateProfile = async (userId, data) => {
    if (data.username) {
        const existing = await User.findOne({ username: data.username.toLowerCase() });
        if (existing && existing._id.toString() !== userId) {
            throw new AppError('Username taken', 409, null, { username: 'Username is already taken' });
        }
    }
    const user = await User.findByIdAndUpdate(userId, data, { new: true, runValidators: true });
    return user;
};