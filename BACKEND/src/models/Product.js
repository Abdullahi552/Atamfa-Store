import mongoose from 'mongoose';

const colorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    hex: { type: String, required: true }
}, { _id: false });

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        code: { type: String, required: true, unique: true, uppercase: true, trim: true },
        category: { 
            type: String, 
            required: true, 
            enum: ['Turmi', 'Ankara', 'Satin', 'Velvet', 'Lace', 'Cotton'] 
        },
        colors: { 
            type: [colorSchema], 
            validate: [arr => arr.length > 0, 'At least one colour is required'] 
        },
        sizes: [{ type: String, enum: ['S', 'M', 'L', 'XL'] }],
        pricePerPic: { type: Number, required: true, min: 0 },
        costPrice: { type: Number, required: true, min: 0 },
        stock: { type: Number, required: true, min: 0, default: 0 },
        lowStockThreshold: { type: Number, required: true, min: 0, default: 5 },
        materialType: { type: String, default: null },
        description: { type: String, default: null },
        archived: { type: Boolean, default: false }
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

export default mongoose.model('Product', productSchema);