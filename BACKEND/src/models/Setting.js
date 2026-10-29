import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
    {
        shopName: { type: String, default: 'Atamfa POS' },
        shopAddress: { type: String, default: '' },
        shopPhone: { type: String, default: '' },
        shopLogoUrl: { type: String, default: null },
        taxRate: { type: Number, default: 2, min: 0, max: 100 },
        maxDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
        lowStockThreshold: { type: Number, default: 5 },
        receiptFooter: { type: String, default: 'Thank you for your patronage.' },
        vacationMode: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Force singleton pattern
settingSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

export default mongoose.model('Setting', settingSchema);