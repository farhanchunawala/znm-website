import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';
import Shipment from '@/models/ShipmentModel';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const archived = searchParams.get('archived') === 'true';
        const sort = searchParams.get('sort') || 'latest';

        const query: any = { archived };

        // Fetch orders
        let orders = await Order.find(query).lean();

        // Fetch all shipments for these orders
        const orderIds = orders.map(o => o._id);
        const shipments = await Shipment.find({ orderId: { $in: orderIds } }).lean();
        const shipmentMap = new Map(shipments.map(s => [s.orderId.toString(), s]));

        // Enrich orders with shipment data and sync status
        orders = orders.map((order: any) => {
            const shipment = shipmentMap.get(order._id.toString());
            return {
                ...order,
                shipment: shipment || null,
                // Sync order status with shipment status if shipment exists
                status: shipment ? shipment.status : order.status,
            };
        });

        // Fetch customer names
        const customerIds = [...new Set(orders.map(o => o.customerId))];
        const customers = await Customer.find({ customerId: { $in: customerIds } }).lean();
        const customerMap = new Map(customers.map(c => [c.customerId, c]));

        orders = orders.map(order => {
            const customer = customerMap.get(order.customerId);
            return {
                ...order,
                customerName: customer ? `${customer.firstName} ${customer.lastName}` : null,
                customer_internal_id: customer?._id,
            };
        });

        // Sort
        if (sort === 'latest') {
            orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (sort === 'oldest') {
            orders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        } else if (sort === 'highestTotal') {
            orders.sort((a, b) => (b.total || 0) - (a.total || 0));
        } else if (sort === 'lowestTotal') {
            orders.sort((a, b) => (a.total || 0) - (b.total || 0));
        }

        return NextResponse.json(orders);
    } catch (error: any) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
