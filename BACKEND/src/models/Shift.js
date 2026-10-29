import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
    {
        cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        loginAt: { type: Date, required: true, default: Date.now },
        logoutAt: { type: Date, default: null },
        durationMinutes: { type: Number, default: 0 },
        status: { type: String, enum: ['active', 'completed'], default: 'active' }
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

export default mongoose.model('Shift', shiftSchema);