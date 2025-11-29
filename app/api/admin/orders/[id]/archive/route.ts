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
        const { archived } = await request.json();

        await Order.findByIdAndUpdate(id, {
            archived,
            archivedAt: archived ? new Date() : null,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to archive order:', error);
        return NextResponse.json({ error: 'Failed to archive order' }, { status: 500 });
    }
}
