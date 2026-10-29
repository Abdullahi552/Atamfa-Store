import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';

const seed = async () => {
    try {
        await connectDB();
        console.log('🌱 Seeding Atamfa POS Database...');

        // Clear existing data
        await User.deleteMany({});
        await Product.deleteMany({});
        await Setting.deleteMany({});

        // 1. Create Users
        const admin = await User.create({
            name: 'Shop Owner',
            username: 'admin',
            password: 'admin123',
            role: 'admin'
        });

        const cashier1 = await User.create({
            name: 'Aisha Bello',
            username: 'aisha',
            password: 'cashier123',
            role: 'cashier'
        });

        const cashier2 = await User.create({
            name: 'Yusuf Musa',
            username: 'yusuf',
            password: 'cashier123',
            role: 'cashier'
        });
        console.log('✅ Users created (admin / aisha / yusuf)');

        // 2. Create Products
        const products = [
            {
                name: 'Atamfa Turmi Premium', code: 'TUR-001', category: 'Turmi',
                colors: [{ name: 'Royal Blue', hex: '#2457C5' }, { name: 'Gold', hex: '#C9962B' }],
                pricePerPic: 18500, costPrice: 14000, stock: 42, lowStockThreshold: 8,
                materialType: '100% Cotton'
            },
            {
                name: 'Satin Wine Deluxe', code: 'SAT-001', category: 'Satin',
                colors: [{ name: 'Wine', hex: '#722F37' }],
                pricePerPic: 12000, costPrice: 9000, stock: 6, lowStockThreshold: 10 // Low stock
            },
            {
                name: 'Ankara Classic', code: 'ANK-001', category: 'Ankara',
                colors: [{ name: 'Multi', hex: '#FF5733' }],
                pricePerPic: 8000, costPrice: 5000, stock: 100, lowStockThreshold: 15
            },
            {
                name: 'Velvet Royal', code: 'VEL-001', category: 'Velvet',
                colors: [{ name: 'Emerald', hex: '#50C878' }],
                pricePerPic: 25000, costPrice: 18000, stock: 15, lowStockThreshold: 5
            },
            {
                name: 'Cotton Plain White', code: 'COT-001', category: 'Cotton',
                colors: [{ name: 'White', hex: '#FFFFFF' }],
                pricePerPic: 5000, costPrice: 3000, stock: 0, lowStockThreshold: 10 // Out of stock
            }
        ];

        await Product.insertMany(products);
        console.log(`✅ ${products.length} Products created`);

        // 3. Create Settings
        await Setting.create({
            shopName: 'Danladi Atamfa House',
            shopAddress: 'Kantin Kwari Market, Kano',
            taxRate: 2,
            maxDiscountPercent: 10,
            lowStockThreshold: 5
        });
        console.log('✅ Settings initialized');

        console.log('🎉 Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
};

seed();