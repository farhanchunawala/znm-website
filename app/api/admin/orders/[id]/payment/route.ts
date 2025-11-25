import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const { id } = params;
        const { paymentStatus } = await request.json();

        await Order.findByIdAndUpdate(id, { paymentStatus });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update payment status:', error);
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
    }
}
