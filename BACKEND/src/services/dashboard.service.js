import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Shift from '../models/Shift.js';

// Helper for date boundaries (Africa/Lagos is UTC+1)
const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Adjusting for UTC+1 manually if needed, but using local server time for simplicity here
    start.setHours(0, 0, 0, 0); 
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
};

export const getDashboardData = async () => {
    const { start, end } = getTodayRange();

    // 1. Today's Stats
    const todayStats = await Sale.aggregate([
        { 
            $match: { 
                status: 'completed',
                createdAt: { $gte: start, $lt: end }
            } 
        },
        {
            $group: {
                _id: null,
                todaySales: { $sum: '$total' },
                revenue: { $sum: { $subtract: ['$subtotal', '$discount.amount'] } },
                costOfGoods: { $sum: { $sum: { $map: { input: '$items', as: 'item', in: { $multiply: ['$$item.quantity', '$$item.unitCost'] } } } } },
                transactions: { $sum: 1 },
                picsSold: { $sum: { $sum: '$items.quantity' } }
            }
        }
    ]);

    const statsData = todayStats[0] || { todaySales: 0, revenue: 0, costOfGoods: 0, transactions: 0, picsSold: 0 };
    const grossProfit = statsData.revenue - statsData.costOfGoods;
    const marginPercent = statsData.revenue > 0 ? Number(((grossProfit / statsData.revenue) * 100).toFixed(1)) : 0;
    const averageOrderValue = statsData.transactions > 0 ? (statsData.todaySales / statsData.transactions) : 0;

    // 2. Low Stock
    const lowStockProducts = await Product.find({
        archived: false,
        $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    }).sort({ stock: 1 }).limit(6);

    const lowStockCount = await Product.countDocuments({
        archived: false,
        $expr: { $lte: ['$stock', '$lowStockThreshold'] }
    });

    // 3. Recent Sales
    const recentSales = await Sale.find({ status: 'completed' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('cashier', 'name');

    // 4. Best Sellers (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const bestSellers = await Sale.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        { 
            $group: {
                _id: '$items.productId',
                name: { $first: '$items.name' },
                code: { $first: '$items.code' },
                colors: { $first: { name: '$items.color.name', hex: '$items.color.hex' } }, // Simplified
                picsSold: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.lineTotal' }
            }
        },
        { $sort: { picsSold: -1 } },
        { $limit: 5 }
    ]);

    // 5. Shifts
    const cashierActivity = await Shift.find({ status: 'active' }).populate('cashier', 'name').limit(5);

    return {
        stats: {
            todaySales: statsData.todaySales,
            grossProfit: grossProfit,
            transactions: statsData.transactions,
            lowStockCount,
            averageOrderValue: Number(averageOrderValue.toFixed(2))
        },
        profitSummary: {
            revenue: statsData.revenue,
            costOfGoods: statsData.costOfGoods,
            grossProfit,
            marginPercent
        },
        lowStock: lowStockProducts,
        recentSales: recentSales.map(s => ({
            id: s._id, receiptNumber: s.receiptNumber, createdAt: s.createdAt,
            cashier: { id: s.cashier._id, name: s.cashier.name },
            total: s.total, status: s.status,
            itemsCount: s.items.reduce((sum, i) => sum + i.quantity, 0),
            paymentMethod: s.paymentMethod
        })),
        bestSellers,
        cashierActivity,
        weeklyTrend: [], // Simplified for now, you can build the full date array mapping
        monthlyTrend: [],
        activityFeed: [] 
    };
};