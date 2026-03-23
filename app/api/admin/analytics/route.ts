import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';
import Product from '@/models/ProductModel';

export async function GET(request: NextRequest) {
	try {
		await dbConnect();

		const { searchParams } = new URL(request.url);
		const days = parseInt(searchParams.get('days') || '30');

		const now = new Date();
		const startOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		);
		const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const startOfYear = new Date(now.getFullYear(), 0, 1);
		const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

		// Fetch all non-archived orders
		const allOrders = await Order.find({ archived: { $ne: true } }).lean();

		// Calculate income periods
		const todayIncome = allOrders
			.filter((o) => new Date(o.createdAt) >= startOfToday)
			.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);

		const weekIncome = allOrders
			.filter((o) => new Date(o.createdAt) >= startOfWeek)
			.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);

		const monthIncome = allOrders
			.filter((o) => new Date(o.createdAt) >= startOfMonth)
			.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);

		const yearIncome = allOrders
			.filter((o) => new Date(o.createdAt) >= startOfYear)
			.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);

		const allTimeIncome = allOrders.reduce(
			(sum, o) => sum + (o.totals?.grandTotal || 0),
			0
		);

		// Daily data for chart
		const dailyData: Array<{ date: string; income: number }> = [];
		for (let i = days - 1; i >= 0; i--) {
			const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
			const dayStart = new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate()
			);
			const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

			const dayIncome = allOrders
				.filter((o) => {
					const orderDate = new Date(o.createdAt);
					return orderDate >= dayStart && orderDate < dayEnd;
				})
				.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);

			dailyData.push({
				date: `${date.getMonth() + 1}/${date.getDate()}`,
				income: dayIncome,
			});
		}

		// Monthly data for last 12 months
		const monthlyData: Array<{ month: string; income: number }> = [];
		for (let i = 11; i >= 0; i--) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
			const monthEnd = new Date(
				date.getFullYear(),
				date.getMonth() + 1,
				0
			);

			const monthIncome = allOrders
				.filter((o) => {
					const orderDate = new Date(o.createdAt);
					return orderDate >= monthStart && orderDate <= monthEnd;
				})
				.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);

			monthlyData.push({
				month: date.toLocaleDateString('en-US', { month: 'short' }),
				income: monthIncome,
			});
		}

		// Top customers
		const customers = await Customer.find({
			archived: { $ne: true },
		}).lean();
		const customerStats = await Promise.all(
			customers.map(async (customer) => {
				const customerOrders = allOrders.filter(
					(o) => o.customerId === customer.customerId
				);
				return {
					name: `${customer.firstName} ${customer.lastName}`,
					totalSpent: customerOrders.reduce(
						(sum, o) => sum + (o.totals?.grandTotal || 0),
						0
					),
					orderCount: customerOrders.length,
				};
			})
		);

		const topCustomers = customerStats
			.filter((c) => c.totalSpent > 0)
			.sort((a, b) => b.totalSpent - a.totalSpent);

		// Payment breakdown
		const prepaidTotal = allOrders
			.filter((o) => o.paymentStatus === 'paid')
			.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);

		const unpaidTotal = allOrders
			.filter((o) => o.paymentStatus === 'pending' || o.paymentStatus === 'failed')
			.reduce((sum, o) => sum + (o.totals?.grandTotal || 0), 0);

		const paymentBreakdown = [
			{ name: 'Paid', value: prepaidTotal },
			{ name: 'Unpaid/Pending', value: unpaidTotal },
		];

		// Most Sold Product Logic
		const productSales: { [key: string]: number } = {};
		allOrders.forEach((order) => {
			if (order.items && Array.isArray(order.items)) {
				order.items.forEach((item) => {
					if (item.productId) {
						const id = item.productId.toString();
						productSales[id] = (productSales[id] || 0) + (item.qty || 0);
					}
				});
			}
		});

		let mostSoldProductId: string | null = null;
		let maxSold = 0;
		for (const [id, qty] of Object.entries(productSales)) {
			if (qty > maxSold) {
				maxSold = qty;
				mostSoldProductId = id;
			}
		}

		let mostSoldProductStats: any = null;
		if (mostSoldProductId) {
			const product: any = await Product.findById(mostSoldProductId).lean();
			if (product) {
				// Monthly data (last 12 months) for this product
				const productMonthly: Array<{ month: string; sales: number }> = [];
				for (let i = 11; i >= 0; i--) {
					const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
					const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
					const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

					const qtySold = allOrders
						.filter((o) => {
							const orderDate = new Date(o.createdAt);
							return orderDate >= monthStart && orderDate <= monthEnd;
						})
						.reduce((sum, o) => {
							const item = o.items?.find((i) => i.productId?.toString() === mostSoldProductId);
							return sum + (item ? item.qty : 0);
						}, 0);

					productMonthly.push({
						month: date.toLocaleDateString('en-US', { month: 'short' }),
						sales: qtySold,
					});
				}

				// Yearly data (last 5 years) for this product
				const productYearly: Array<{ year: string; sales: number }> = [];
				for (let i = 4; i >= 0; i--) {
					const yearStart = new Date(now.getFullYear() - i, 0, 1);
					const yearEnd = new Date(now.getFullYear() - i, 11, 31, 23, 59, 59);
					const yearLabel = (now.getFullYear() - i).toString();

					const qtySold = allOrders
						.filter((o) => {
							const orderDate = new Date(o.createdAt);
							return orderDate >= yearStart && orderDate <= yearEnd;
						})
						.reduce((sum, o) => {
							const item = o.items?.find((i) => i.productId?.toString() === mostSoldProductId);
							return sum + (item ? item.qty : 0);
						}, 0);

					productYearly.push({
						year: yearLabel,
						sales: qtySold,
					});
				}

				mostSoldProductStats = {
					name: product.title || 'Unknown Product',
					totalSold: maxSold,
					monthlyData: productMonthly,
					yearlyData: productYearly,
				};
			}
		}

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
			mostSoldProductStats,
		});
	} catch (error) {
		console.error('Failed to fetch analytics:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch analytics' },
			{ status: 500 }
		);
	}
}
