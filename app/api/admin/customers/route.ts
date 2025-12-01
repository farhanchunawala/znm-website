import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';
import Order from '@/models/OrderModel';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const archived = searchParams.get('archived') === 'true';
        const sort = searchParams.get('sort') || 'latest';

        // Build query
        const query = archived ? { archived: true } : { archived: { $ne: true } };

        // Fetch customers
        let customers = await Customer.find(query).lean();

        // Get order counts and totals for each customer
        const customersWithStats = await Promise.all(
            customers.map(async (customer) => {
                const orders = await Order.find({
                    customerId: customer.customerId,
                    archived: { $ne: true }
                });

                return {
                    ...customer,
                    orderCount: orders.length,
                    totalSpent: orders.reduce((sum, order) => sum + (order.total || 0), 0),
                };
            })
        );

        // Sort customers
        let sortedCustomers = [...customersWithStats];
        switch (sort) {
            case 'oldest':
                sortedCustomers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                break;
            case 'mostOrders':
                sortedCustomers.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
                break;
            case 'leastOrders':
                sortedCustomers.sort((a, b) => (a.orderCount || 0) - (b.orderCount || 0));
                break;
            case 'highestSpent':
                sortedCustomers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
                break;
            case 'lowestSpent':
                sortedCustomers.sort((a, b) => (a.totalSpent || 0) - (b.totalSpent || 0));
                break;
            case 'nameAZ':
                sortedCustomers.sort((a, b) => a.firstName.localeCompare(b.firstName));
                break;
            case 'nameZA':
                sortedCustomers.sort((a, b) => b.firstName.localeCompare(a.firstName));
                break;
            case 'latest':
            default:
                sortedCustomers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return NextResponse.json(sortedCustomers);
    } catch (error) {
        console.error('Failed to fetch customers:', error);
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}
