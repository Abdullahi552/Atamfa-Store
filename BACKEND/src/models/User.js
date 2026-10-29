import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        username: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 8, select: false },
        role: { type: String, enum: ['admin', 'cashier'], default: 'cashier' },
        email: { type: String, default: null, trim: true },
        phone: { type: String, default: null, trim: true },
        avatarUrl: { type: String, default: null },
        active: { type: Boolean, default: true }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (doc, ret) => {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                delete ret.password;
                return ret;
            }
        }
    }
);

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (candidate) {
    return await bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);