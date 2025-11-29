import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';
import Order from '@/models/OrderModel';

export async function GET() {
    try {
        await dbConnect();

        const [totalCustomers, totalOrders, orders] = await Promise.all([
            Customer.countDocuments({ archived: { $ne: true } }),
            Order.countDocuments({ archived: { $ne: true } }),
            Order.find({ archived: { $ne: true } }),
        ]);

        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const pendingOrders = orders.filter(order => order.paymentStatus === 'unpaid').length;

        return NextResponse.json({
            totalCustomers,
            totalOrders,
            totalRevenue,
            pendingOrders,
        });
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
