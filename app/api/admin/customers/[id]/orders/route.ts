import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const { id } = params;

        // Get customer to find customerId
        const customer = await Customer.findById(id);
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Get all orders for this customer
        const orders = await Order.find({
            customerId: customer.customerId,
            archived: { $ne: true }
        }).sort({ createdAt: -1 });

        return NextResponse.json(orders);
    } catch (error) {
        console.error('Failed to fetch customer orders:', error);
        return NextResponse.json({ error: 'Failed to fetch customer orders' }, { status: 500 });
    }
}
