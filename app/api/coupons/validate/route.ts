import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Coupon from '@/models/CouponModel';
import CouponUsage from '@/models/CouponUsageModel';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { code } = await request.json();

        if (!code) {
            return NextResponse.json({ error: 'Coupon code required' }, { status: 400 });
        }

        await dbConnect();

        // Find coupon
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });

        if (!coupon) {
            return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
        }

        // Check expiry
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
        }

        // Check if individual coupon matches user
        if (coupon.type === 'individual' && coupon.userId?.toString() !== currentUser.userId) {
            return NextResponse.json({ error: 'This coupon is not available for your account' }, { status: 403 });
        }

        // Check usage limit
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
        }

        // Check if user already used this coupon (for single-use coupons)
        if (coupon.maxUses === 1 || coupon.type === 'individual') {
            const existingUsage = await CouponUsage.findOne({
                couponId: coupon._id,
                userId: currentUser.userId,
            });

            if (existingUsage) {
                return NextResponse.json({ error: 'You have already used this coupon' }, { status: 400 });
            }
        }

        // Return valid coupon details
        return NextResponse.json({
            valid: true,
            coupon: {
                code: coupon.code,
                discount: coupon.discount,
                discountType: coupon.discountType,
                description: coupon.description,
            },
        });
    } catch (error) {
        console.error('Coupon validation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
