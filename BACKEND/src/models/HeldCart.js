import mongoose from 'mongoose';

const heldItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // <--- ADD THIS LINE
    color: { name: String, hex: String },
    quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const heldCartSchema = new mongoose.Schema(
    {
        cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        items: [heldItemSchema],
        discount: {
            type: { type: String, enum: ['percent', 'amount'] },
            value: { type: Number }
        }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (doc, ret) => {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                return ret;
            }
        }
    }
);

export default mongoose.model('HeldCart', heldCartSchema);