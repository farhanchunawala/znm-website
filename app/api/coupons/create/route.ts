import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Coupon from '@/models/CouponModel';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, discount, discountType, type, userId, maxUses, expiresAt, description } = body;

        // Validation
        if (!code || !discount || !discountType || !type) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (type === 'individual' && !userId) {
            return NextResponse.json(
                { error: 'User ID required for individual coupons' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if code already exists
        const existing = await Coupon.findOne({ code: code.toUpperCase() });
        if (existing) {
            return NextResponse.json(
                { error: 'Coupon code already exists' },
                { status: 409 }
            );
        }

        // Create coupon
        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            discount,
            discountType,
            type,
            userId: type === 'individual' ? userId : null,
            maxUses: maxUses || null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            description,
            active: true,
        });

        return NextResponse.json({
            success: true,
            coupon: {
                id: coupon._id,
                code: coupon.code,
                discount: coupon.discount,
                discountType: coupon.discountType,
                type: coupon.type,
                maxUses: coupon.maxUses,
                expiresAt: coupon.expiresAt,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Coupon creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        await dbConnect();
        const coupons = await Coupon.find().sort({ createdAt: -1 });

        return NextResponse.json({
            coupons: coupons.map(c => ({
                id: c._id,
                code: c.code,
                discount: c.discount,
                discountType: c.discountType,
                type: c.type,
                maxUses: c.maxUses,
                usedCount: c.usedCount,
                expiresAt: c.expiresAt,
                active: c.active,
                description: c.description,
                createdAt: c.createdAt,
            })),
        });
    } catch (error) {
        console.error('Fetch coupons error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
