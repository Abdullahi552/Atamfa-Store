import HeldCart from '../models/HeldCart.js';
import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';

export const getHeldCarts = async (cashierId) => {
    return await HeldCart.find({ cashier: cashierId }).sort({ createdAt: -1 });
};

export const createHeldCart = async (cashierId, data) => {
    // Safety check
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
        throw new AppError('Cart must contain at least one item.', 422);
    }

    // We need to fetch product names to store them for display
    const itemsWithNames = [];
    for (const item of data.items) {
        const product = await Product.findById(item.productId);
        if (product) {
            itemsWithNames.push({
                productId: item.productId,
                name: product.name, // We add the name here
                color: item.color,
                quantity: item.quantity
            });
        }
    }

    return await HeldCart.create({
        cashier: cashierId,
        items: itemsWithNames,
        discount: data.discount || null
    });
};

export const deleteHeldCart = async (id, cashierId) => {
    const cart = await HeldCart.findOneAndDelete({ _id: id, cashier: cashierId });
    if (!cart) throw new AppError('Held cart not found', 404);
};