import User from '../models/User.js';
import Sale from '../models/Sale.js';
import Shift from '../models/Shift.js';
import AppError from '../utils/AppError.js';
import crypto from 'crypto';

export const getAllCashiers = async () => {
    const cashiers = await User.find({ role: 'cashier' }).sort({ name: 1 });
    
    // Get today, week, month boundaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(today);
    week.setDate(today.getDate() - today.getDay() + 1); // Monday
    const month = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = [];
    for (const cashier of cashiers) {
        const stats = await Sale.aggregate([
            { $match: { cashier: cashier._id, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    overall: { $sum: '$total' },
                    today: { $sum: { $cond: [{ $gte: ['$createdAt', today] }, '$total', 0] } },
                    week: { $sum: { $cond: [{ $gte: ['$createdAt', week] }, '$total', 0] } },
                    month: { $sum: { $cond: [{ $gte: ['$createdAt', month] }, '$total', 0] } }
                }
            }
        ]);

        const s = stats[0] || { overall: 0, today: 0, week: 0, month: 0 };
        
        result.push({
            ...cashier.toJSON(),
            stats: { today: s.today, week: s.week, month: s.month, overall: s.overall }
        });
    }
    return result;
};

export const createCashier = async (data) => {
    const existing = await User.findOne({ username: data.username.toLowerCase() });
    if (existing) throw new AppError('Username already taken', 409, null, { username: 'Username is taken' });

    return await User.create({
        name: data.name,
        username: data.username,
        password: data.password,
        role: 'cashier'
    });
};

export const updateCashier = async (id, data) => {
    const cashier = await User.findById(id);
    if (!cashier) throw new AppError('Cashier not found', 404);

    if (data.username && data.username.toLowerCase() !== cashier.username) {
        const existing = await User.findOne({ username: data.username.toLowerCase() });
        if (existing) throw new AppError('Username already taken', 409, null, { username: 'Username is taken' });
    }

    Object.assign(cashier, data);
    await cashier.save();

    if (data.active === false) {
        // Close active shift
        await Shift.updateMany(
            { cashier: id, status: 'active' },
            { logoutAt: new Date(), status: 'completed' }
        );
    }
    return cashier;
};

export const resetPassword = async (id) => {
    const cashier = await User.findById(id);
    if (!cashier) throw new AppError('Cashier not found', 404);

    const tempPassword = crypto.randomBytes(5).toString('hex'); // 10 chars
    cashier.password = tempPassword;
    await cashier.save();
    return { tempPassword };
};