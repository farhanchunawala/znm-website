import mongoose, { Schema } from 'mongoose';

const CouponUsageSchema = new mongoose.Schema(
    {
        couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
        usedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Index for quick lookups
CouponUsageSchema.index({ couponId: 1, userId: 1 });

const CouponUsage = mongoose.models.CouponUsage || mongoose.model('CouponUsage', CouponUsageSchema, 'coupon_usage');
export default CouponUsage;
