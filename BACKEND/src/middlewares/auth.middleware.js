import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

export const protect = catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        throw new AppError('Not authorized, no token provided', 401);
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        throw new AppError('Not authorized, token invalid or expired', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
        throw new AppError('User no longer exists', 401);
    }
    
    // Strict rule from doc: deactivated user gets 403
    if (!user.active) {
        throw new AppError('Account deactivated', 403);
    }

    req.user = user;
    next();
});

export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action.', 403));
        }
        next();
    };
};