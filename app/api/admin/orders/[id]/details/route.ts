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

        // Try to find by _id first, then by orderId
        let order = await Order.findOne({
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { orderId: id }
            ]
        }).lean();

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Fetch customer details to get the internal _id if needed, 
        // but we mostly need the shipping info which is on the order.
        // We might want to link to the customer profile, so let's verify the customer exists.
        const customer = await Customer.findOne({ customerId: (order as any).customerId });

        return NextResponse.json({
            ...order,
            customer_internal_id: customer?._id // Useful for linking if we used _id for links
        });
    } catch (error) {
        console.error('Failed to fetch order details:', error);
        return NextResponse.json({ error: 'Failed to fetch order details' }, { status: 500 });
    }
}
