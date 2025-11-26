import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const archived = searchParams.get('archived') === 'true';
        const sort = searchParams.get('sort') || 'latest';

        const query = archived ? { archived: true } : { archived: { $ne: true } };

        let orders = await Order.find(query).lean();

        // Get customer names and internal IDs
        const ordersWithCustomerNames = await Promise.all(
            orders.map(async (order) => {
                const customer = await Customer.findOne({ customerId: order.customerId });
                return {
                    ...order,
                    customerName: customer ? `${customer.firstName} ${customer.lastName}` : null,
                    customer_internal_id: customer?._id?.toString() || null,
                } as typeof order & { customerName: string | null; customer_internal_id: string | null };
            })
        );

        // Sort orders
        let sortedOrders = [...ordersWithCustomerNames];
        switch (sort) {
            case 'oldest':
                sortedOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                break;
            case 'highestTotal':
                sortedOrders.sort((a, b) => (b.total || 0) - (a.total || 0));
                break;
            case 'lowestTotal':
                sortedOrders.sort((a, b) => (a.total || 0) - (b.total || 0));
                break;
            case 'latest':
            default:
                sortedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return NextResponse.json(sortedOrders);
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
