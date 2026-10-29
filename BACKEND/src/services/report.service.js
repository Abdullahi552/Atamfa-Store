import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const getPeriodStats = async (matchStage) => {
    // 1. Get Summary
    const summaryData = await Sale.aggregate([
        { $match: { status: 'completed', ...matchStage } },
        {
            $group: {
                _id: null,
                revenue: { $sum: { $subtract: ['$subtotal', '$discount.amount'] } },
                costOfGoods: { $sum: { $sum: { $map: { input: '$items', as: 'item', in: { $multiply: ['$$item.quantity', '$$item.unitCost'] } } } } },
                transactions: { $sum: 1 },
                picsSold: { $sum: { $sum: '$items.quantity' } },
                totalCollected: { $sum: '$total' }
            }
        }
    ]);

    const s = summaryData[0] || { revenue: 0, costOfGoods: 0, transactions: 0, picsSold: 0, totalCollected: 0 };
    const grossProfit = s.revenue - s.costOfGoods;
    const marginPercent = s.revenue > 0 ? Number(((grossProfit / s.revenue) * 100).toFixed(1)) : 0;
    const averageOrderValue = s.transactions > 0 ? (s.totalCollected / s.transactions) : 0;

    return {
        summary: {
            revenue: s.revenue,
            costOfGoods: s.costOfGoods,
            grossProfit,
            marginPercent,
            transactions: s.transactions,
            picsSold: s.picsSold,
            averageOrderValue: Number(averageOrderValue.toFixed(2))
        }
    };
};

export const getDailyReport = async (dateStr) => {
    const date = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));

    const stats = await getPeriodStats({ createdAt: { $gte: start, $lte: end } });

    // Breakdown by hour
    const breakdown = await Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: { $hour: { date: '$createdAt', timezone: 'Africa/Lagos' } },
                revenue: { $sum: { $subtract: ['$subtotal', '$discount.amount'] } },
                cost: { $sum: { $sum: { $map: { input: '$items', as: 'item', in: { $multiply: ['$$item.quantity', '$$item.unitCost'] } } } } },
                transactions: { $sum: 1 },
                pics: { $sum: { $sum: '$items.quantity' } }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const formattedBreakdown = breakdown.map(b => ({
        key: b._id,
        label: `${b._id > 12 ? b._id - 12 : b._id} ${b._id >= 12 ? 'PM' : 'AM'}`,
        revenue: b.revenue,
        profit: b.revenue - b.cost,
        transactions: b.transactions,
        pics: b.pics
    }));

    return { period: { from: start, to: end }, ...stats, breakdown: formattedBreakdown };
};

export const getBestsellers = async (fromStr, toStr, limit = 10) => {
    const match = { status: 'completed' };
    if (fromStr) match.createdAt = { $gte: new Date(fromStr) };
    if (toStr) match.createdAt = { ...match.createdAt, $lte: new Date(toStr) };

    const data = await Sale.aggregate([
        { $match: match },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.productId',
                name: { $first: '$items.name' },
                code: { $first: '$items.code' },
                picsSold: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.lineTotal' },
                profit: { $sum: { $subtract: ['$items.lineTotal', { $multiply: ['$items.quantity', '$items.unitCost'] }] } }
            }
        },
        { $sort: { picsSold: -1 } },
        { $limit: Number(limit) }
    ]);

    return { data };
};

export const getInventory = async () => {
    const products = await Product.find({ archived: false });
    
    let totalPics = 0;
    let stockValueCost = 0;
    let stockValueRetail = 0;

    products.forEach(p => {
        totalPics += p.stock;
        stockValueCost += (p.stock * p.costPrice);
        stockValueRetail += (p.stock * p.pricePerPic);
    });

    return {
        data: products,
        totals: { itemCount: products.length, totalPics, stockValueCost, stockValueRetail }
    };
};