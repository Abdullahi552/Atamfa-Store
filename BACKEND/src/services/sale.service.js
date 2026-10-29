import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import Counter from '../models/Counter.js';
import AppError from '../utils/AppError.js';

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

export const createSale = async (cashierId, body) => {
    const { items, discount, paymentMethod, amountTendered } = body;

    const settings = await Setting.getSettings();
    if (settings.vacationMode) {
        throw new AppError('Sales are paused (Vacation Mode)', 403, 'VACATION_MODE');
    }

    // Start an ACID transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let subtotal = 0;
        const saleItems = [];
        const productUpdates = {}; // Track qty to deduct per product

                // 1. Process items and calculate subtotal
        for (const item of items) {
            const product = await Product.findById(item.productId).session(session);
            if (!product || product.archived) {
                throw new AppError(`Product unavailable`, 404, 'PRODUCT_UNAVAILABLE');
            }

            // Validate Color
            if (item.color && item.color.name) {
                const hasColor = product.colors.some(
                    (c) => c.name.toLowerCase() === item.color.name.toLowerCase()
                );
                if (!hasColor) {
                    throw new AppError(
                        `The colour ${item.color.name} is not available for ${product.name}.`,
                        422,
                        'INVALID_COLOR'
                    );
                }
            } else if (!item.color && product.colors.length > 0) {
                // If the frontend doesn't send a color, but the product has colors
                throw new AppError(`Please select a colour for ${product.name}.`, 422, 'INVALID_COLOR');
            }

            // Add to total stock to deduct
            if (!productUpdates[product._id]) productUpdates[product._id] = 0;
            productUpdates[product._id] += item.quantity;

            const lineTotal = round2(product.pricePerPic * item.quantity);
            subtotal += lineTotal;

            saleItems.push({
                productId: product._id,
                name: product.name,
                code: product.code,
                color: item.color,
                quantity: item.quantity,
                unitPrice: product.pricePerPic,
                unitCost: product.costPrice, // Snapshot
                lineTotal
            });
        }

        // 2. Validate Stock
        for (const [productId, qtyNeeded] of Object.entries(productUpdates)) {
            const product = await Product.findById(productId).session(session);
            if (product.stock < qtyNeeded) {
                throw new AppError(
                    `Only ${product.stock} pics of ${product.name} left.`,
                    422,
                    'INSUFFICIENT_STOCK',
                    null,
                    { productId, available: product.stock }
                );
            }
        }

        // 3. Calculate Discount
        let discountAmount = 0;
        if (discount && discount.value > 0) {
            const maxDisc = round2(subtotal * (settings.maxDiscountPercent / 100));
            const rawDisc = discount.type === 'percent' ? round2(subtotal * (discount.value / 100)) : discount.value;
            
            if (rawDisc > maxDisc + 0.01) {
                throw new AppError('Discount exceeds maximum allowed', 422, 'DISCOUNT_TOO_HIGH');
            }
            discountAmount = rawDisc;
        }

        // 4. Calculate Tax and Total
        const taxable = round2(subtotal - discountAmount);
        const tax = round2(taxable * (settings.taxRate / 100));
        const total = round2(taxable + tax);

        // 5. Generate Receipt Number
        const seq = await Counter.getNext('receipt');
        const receiptNumber = `RCP-${seq.toString().padStart(6, '0')}`;

        // 6. Deduct Stock Atomically
        for (const [productId, qty] of Object.entries(productUpdates)) {
            await Product.updateOne(
                { _id: productId },
                { $inc: { stock: -qty } },
                { session }
            );
        }

        // 7. Create Sale
        const [sale] = await Sale.create([{
            receiptNumber,
            cashier: cashierId,
            items: saleItems,
            subtotal,
            discount: discount ? { type: discount.type, value: discount.value, amount: discountAmount } : null,
            tax,
            taxRate: settings.taxRate,
            total,
            paymentMethod,
            amountTendered: amountTendered || null,
            status: 'completed'
        }], { session });

        await session.commitTransaction();
        session.endSession();

        // Populate cashier for response
        await sale.populate('cashier', 'name');
        return sale;

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

export const getSales = async (query, user) => {
    const { from, to, productId, status, paymentMethod, search, page = 1, limit = 20 } = query;
    const filter = {};

    // Role restrictions
    if (user.role === 'cashier') {
        filter.cashier = user._id;
    } else if (query.cashierId) {
        filter.cashier = query.cashierId;
    }

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (search) filter.receiptNumber = { $regex: search, $options: 'i' };
    
    // Date filters (Shop timezone UTC+1) - simplified for this example
    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000+01:00`);
        if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999+01:00`);
    }

    if (productId) filter['items.productId'] = productId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sales = await Sale.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('cashier', 'name');

    const total = await Sale.countDocuments(filter);

    // Map to SaleSummary format
    const summaries = sales.map(sale => ({
        id: sale._id.toString(),
        receiptNumber: sale.receiptNumber,
        createdAt: sale.createdAt,
        cashier: { id: sale.cashier._id, name: sale.cashier.name },
        itemsCount: sale.items.reduce((sum, item) => sum + item.quantity, 0),
        paymentMethod: sale.paymentMethod,
        total: sale.total,
        status: sale.status
    }));

    return {
        data: summaries,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    };
};

export const getSaleById = async (id, user) => {
    const sale = await Sale.findById(id).populate('cashier', 'name');
    if (!sale) throw new AppError('Sale not found', 404);

    if (user.role === 'cashier' && sale.cashier._id.toString() !== user._id.toString()) {
        throw new AppError('Sale not found', 404); // Hide existence
    }

    // Format response
    return {
        ...sale.toJSON(),
        cashier: { id: sale.cashier._id.toString(), name: sale.cashier.name }
    };
};

export const refundSale = async (id, user, reason) => {
    if (!reason || reason.length < 3) {
        throw new AppError('Reason is required', 422, null, { reason: 'Reason must be at least 3 characters' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sale = await Sale.findById(id).session(session);
        if (!sale) throw new AppError('Sale not found', 404);

        if (sale.status === 'refunded') throw new AppError('Sale already refunded', 409);

        // Cashier validation (own sale, same day)
        if (user.role === 'cashier') {
            if (sale.cashier.toString() !== user._id.toString()) {
                throw new AppError('You can only refund your own sales', 403);
            }
            // Same day check
            const isToday = sale.createdAt.toDateString() === new Date().toDateString();
            if (!isToday) throw new AppError('You can only refund today\'s sales', 403);
        }

        // Restore stock
        for (const item of sale.items) {
            await Product.updateOne(
                { _id: item.productId },
                { $inc: { stock: item.quantity } },
                { session }
            );
        }

        sale.status = 'refunded';
        sale.refundedAt = new Date();
        sale.refundReason = reason;
        sale.refundedBy = user._id;
        await sale.save({ session });

        await session.commitTransaction();
        session.endSession();

        return sale;

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};