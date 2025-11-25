import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        // Fetch all non-archived orders
        const allOrders = await Order.find({ archived: { $ne: true } }).lean();

        // Calculate income periods
        const todayIncome = allOrders
            .filter(o => new Date(o.createdAt) >= startOfToday)
            .reduce((sum, o) => sum + (o.total || 0), 0);

        const weekIncome = allOrders
            .filter(o => new Date(o.createdAt) >= startOfWeek)
            .reduce((sum, o) => sum + (o.total || 0), 0);

        const monthIncome = allOrders
            .filter(o => new Date(o.createdAt) >= startOfMonth)
            .reduce((sum, o) => sum + (o.total || 0), 0);

        const yearIncome = allOrders
            .filter(o => new Date(o.createdAt) >= startOfYear)
            .reduce((sum, o) => sum + (o.total || 0), 0);

        const allTimeIncome = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        // Daily data for chart
        const dailyData = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

            const dayIncome = allOrders
                .filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate >= dayStart && orderDate < dayEnd;
                })
                .reduce((sum, o) => sum + (o.total || 0), 0);

            dailyData.push({
                date: `${date.getMonth() + 1}/${date.getDate()}`,
                income: dayIncome,
            });
        }

        // Monthly data for last 12 months
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthIncome = allOrders
                .filter(o => {
                    const orderDate = new Date(o.createdAt);
                    return orderDate >= monthStart && orderDate <= monthEnd;
                })
                .reduce((sum, o) => sum + (o.total || 0), 0);

            monthlyData.push({
                month: date.toLocaleDateString('en-US', { month: 'short' }),
                income: monthIncome,
            });
        }

        // Top customers
        const customers = await Customer.find({ archived: { $ne: true } }).lean();
        const customerStats = await Promise.all(
            customers.map(async (customer) => {
                const customerOrders = allOrders.filter(o => o.customerId === customer.customerId);
                return {
                    name: `${customer.firstName} ${customer.lastName}`,
                    totalSpent: customerOrders.reduce((sum, o) => sum + (o.total || 0), 0),
                    orderCount: customerOrders.length,
                };
            })
        );

        const topCustomers = customerStats
            .filter(c => c.totalSpent > 0)
            .sort((a, b) => b.totalSpent - a.totalSpent);

        // Payment breakdown
        const prepaidTotal = allOrders
            .filter(o => o.paymentStatus === 'prepaid')
            .reduce((sum, o) => sum + (o.total || 0), 0);

        const unpaidTotal = allOrders
            .filter(o => o.paymentStatus === 'unpaid')
            .reduce((sum, o) => sum + (o.total || 0), 0);

        const paymentBreakdown = [
            { name: 'Prepaid', value: prepaidTotal },
            { name: 'Unpaid', value: unpaidTotal },
        ];

        return NextResponse.json({
            todayIncome,
            weekIncome,
            monthIncome,
            yearIncome,
            allTimeIncome,
            dailyData,
            monthlyData,
            topCustomers,
            paymentBreakdown,
        });
    } catch (error) {
        console.error('Failed to fetch analytics:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
