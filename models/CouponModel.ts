import mongoose, { Schema } from 'mongoose';

const CouponSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true },
        discount: { type: Number, required: true }, // Amount or percentage
        discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
        type: { type: String, enum: ['global', 'individual'], required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User' }, // For individual coupons
        maxUses: { type: Number, default: null }, // null = unlimited
        usedCount: { type: Number, default: 0 },
        expiresAt: { type: Date, default: null }, // null = no expiry
        active: { type: Boolean, default: true },
        description: { type: String },
    },
    { timestamps: true }
);

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema, 'coupons');
export default Coupon;
