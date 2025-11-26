import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const data = await request.json();
        const { customerId, items, total, paymentStatus, notes, shippingInfo } = data;

        // Verify customer exists
        const customer = await Customer.findOne({ customerId });
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Create order
        const order = await Order.create({
            customerId,
            items,
            total,
            paymentStatus: paymentStatus || 'unpaid',
            status: 'pending',
            notes,
            shippingInfo,
        });

        return NextResponse.json({ success: true, order }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create order:', error);
        return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
    }
}
