import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

const Razorpay = require('razorpay');

export async function POST(request: NextRequest) {
	try {
		await connectDB();

		const { amount, currency, receipt } = await request.json();

		if (!amount || !currency || !receipt) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		const razorpay = new Razorpay({
			key_id: process.env.RAZORPAY_KEY_ID,
			key_secret: process.env.RAZORPAY_KEY_SECRET,
		});

		const options = {
			amount: amount, // Amount in paise
			currency: currency,
			receipt: receipt,
		};

		const order = await razorpay.orders.create(options);

		return NextResponse.json(
			{
				success: true,
				orderId: order.id,
				amount: order.amount,
				currency: order.currency,
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error('Create order error:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to create order' },
			{ status: 500 }
		);
	}
}
