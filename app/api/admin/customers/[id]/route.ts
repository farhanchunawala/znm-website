import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';
import Order from '@/models/OrderModel';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const { id } = params;

        // Delete customer
        await Customer.findByIdAndDelete(id);

        // Optionally delete associated orders
        // await Order.deleteMany({ customerId: customer.customerId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete customer:', error);
        return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
    }
}
