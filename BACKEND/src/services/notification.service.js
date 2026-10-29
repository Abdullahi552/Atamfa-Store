import Product from '../models/Product.js';
import Sale from '../models/Sale.js';

export const getNotifications = async () => {
    const notifications = [];

    // 1. Low stock alerts
    const lowStockProducts = await Product.find({
        archived: false,
        $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).limit(10);

    lowStockProducts.forEach(p => {
        notifications.push({
            id: `low-${p._id}`,
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `${p.name} has only ${p.stock} pics left.`,
            read: false,
            createdAt: p.updatedAt
        });
    });

    // 2. Recent Sales
    const recentSales = await Sale.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('cashier', 'name');

    recentSales.forEach(s => {
        notifications.push({
            id: `sale-${s._id}`,
            type: 'sale',
            title: 'New Sale',
            message: `${s.cashier.name} completed ${s.receiptNumber} (₦${s.total})`,
            read: false,
            createdAt: s.createdAt
        });
    });

    // Sort all by date desc
    return notifications.sort((a, b) => b.createdAt - a.createdAt);
};