import Product from '../models/Product.js';
import AppError from '../utils/AppError.js';

export const getAllProducts = async (query) => {
    const { search, category, color, stockStatus, status, sortBy, sortOrder, page = 1, limit = 20 } = query;
    
    const filter = {};
    
    // Status filter (active by default)
    if (status === 'archived') filter.archived = true;
    else if (status === 'all') { /* no filter */ }
    else filter.archived = false; // default active

    if (category) filter.category = category;
    if (color) filter['colors.name'] = { $regex: new RegExp(`^${color}$`, 'i') };
    
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } }
        ];
    }

    // Stock Status requires $expr because threshold is dynamic per product
    if (stockStatus) {
        if (stockStatus === 'out') filter.stock = { $lte: 0 };
        else if (stockStatus === 'low') filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
        else if (stockStatus === 'medium') filter.$expr = { 
            $and: [
                { $gt: ['$stock', '$lowStockThreshold'] },
                { $lte: ['$stock', { $multiply: ['$lowStockThreshold', 3] }] }
            ]
        };
        else if (stockStatus === 'high') filter.$expr = { $gt: ['$stock', { $multiply: ['$lowStockThreshold', 3] }] };
    }

    // Sorting
    const sortOptions = {};
    const sortField = sortBy || 'name';
    sortOptions[sortField] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const maxLimit = Math.min(parseInt(limit), 500);

    const products = await Product.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(maxLimit);

    const total = await Product.countDocuments(filter);

    return {
        data: products,
        pagination: {
            page: parseInt(page),
            limit: maxLimit,
            total,
            totalPages: Math.ceil(total / maxLimit)
        }
    };
};

export const createProduct = async (data) => {
    return await Product.create(data);
};

export const updateProduct = async (id, data) => {
    const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!product) throw new AppError('Product not found', 404);
    return product;
};

export const deleteProduct = async (id) => {
    const product = await Product.findByIdAndUpdate(id, { archived: true }, { new: true });
    if (!product) throw new AppError('Product not found', 404);
};
export const getProductById = async (id) => {
    const product = await Product.findById(id);
    if (!product) throw new AppError('Product not found', 404);
    return product;
};