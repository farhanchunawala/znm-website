import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const { id } = params;
        const { archived } = await request.json();

        await Customer.findByIdAndUpdate(id, {
            archived,
            archivedAt: archived ? new Date() : null,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to archive customer:', error);
        return NextResponse.json({ error: 'Failed to archive customer' }, { status: 500 });
    }
}
