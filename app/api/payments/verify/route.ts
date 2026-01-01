import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import crypto from 'crypto';
import PaymentModel from '@/models/PaymentModel';
import OrderService from '@/lib/services/orderService';

const Razorpay = require('razorpay');

export async function POST(request: NextRequest) {
	try {
		await connectDB();

		const {
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
			checkoutData,
		} = await request.json();

		if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
			return NextResponse.json(
				{ success: false, error: 'Missing payment credentials' },
				{ status: 400 }
			);
		}

		// Verify payment signature
		const generatedSignature = crypto
			.createHmac(
				'sha256',
				process.env.RAZORPAY_KEY_SECRET!
			)
			.update(`${razorpay_order_id}|${razorpay_payment_id}`)
			.digest('hex');

		if (generatedSignature !== razorpay_signature) {
			return NextResponse.json(
				{
					success: false,
					error: 'Payment verification failed',
				},
				{ status: 400 }
			);
		}

		// Signature is valid, now create order
		try {
			const order = await OrderService.createOrder({
				formData: checkoutData.formData,
				cartItems: checkoutData.cartItems,
				total: checkoutData.total,
				appliedCoupon: checkoutData.appliedCoupon,
				paymentId: razorpay_payment_id,
				razorpayOrderId: razorpay_order_id,
				paymentStatus: 'completed',
			});

			// Save payment record
			await PaymentModel.create({
				orderId: order._id,
				razorpayOrderId: razorpay_order_id,
				razorpayPaymentId: razorpay_payment_id,
				amount: checkoutData.total,
				currency: 'INR',
				status: 'completed',
				meta: {
					email: checkoutData.formData.email,
					phone: checkoutData.formData.phone,
				},
			});

			return NextResponse.json(
				{
					success: true,
					orderId: order._id,
					message: 'Payment verified and order created successfully',
				},
				{ status: 200 }
			);
		} catch (orderError: any) {
			console.error('Order creation error:', orderError);
			return NextResponse.json(
				{
					success: false,
					error: 'Payment verified but order creation failed',
				},
				{ status: 500 }
			);
		}
	} catch (error: any) {
		console.error('Verify payment error:', error);
		return NextResponse.json(
			{ success: false, error: error.message || 'Verification failed' },
			{ status: 500 }
		);
	}
}
