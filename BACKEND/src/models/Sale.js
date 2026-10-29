import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // Snapshot
    code: { type: String, required: true }, // Snapshot
    color: {
        name: { type: String },
        hex: { type: String }
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true }, // Snapshot
    unitCost: { type: Number, required: true },  // Snapshot (for profit reports)
    lineTotal: { type: Number, required: true }
}, { _id: false });

const saleSchema = new mongoose.Schema(
    {
        receiptNumber: { type: String, required: true, unique: true },
        cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        items: [saleItemSchema],
        subtotal: { type: Number, required: true },
        discount: {
            type: { type: String, enum: ['percent', 'amount'] },
            value: { type: Number },
            amount: { type: Number, default: 0 }
        },
        tax: { type: Number, required: true },
        taxRate: { type: Number, required: true },
        total: { type: Number, required: true },
        paymentMethod: { type: String, enum: ['cash', 'transfer', 'pos'], required: true },
        amountTendered: { type: Number, default: null },
        status: { type: String, enum: ['completed', 'processing', 'refunded'], default: 'completed' },
        refundedAt: { type: Date, default: null },
        refundReason: { type: String, default: null },
        refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (doc, ret) => {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                delete ret.refundedBy;
                // Hide unitCost from frontend response as per contract 3.3
                if (ret.items) {
                    ret.items = ret.items.map(item => {
                        delete item.unitCost;
                        return item;
                    });
                }
                return ret;
            }
        }
    }
);

export default mongoose.model('Sale', saleSchema);