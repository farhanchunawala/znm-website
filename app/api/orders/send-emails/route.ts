import { NextRequest, NextResponse } from 'next/server';
import { sendOrderThankYouEmail, sendNewOrderNotificationEmail } from '@/lib/email';

/**
 * POST /api/orders/send-emails
 * Send order confirmation emails to customer and admin
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const {
			orderId,
			customerEmail,
			customerName,
			customerPhone,
			items,
			total,
			paymentMethod,
			shippingAddress,
		} = body;

		// Validate required fields
		if (!orderId || !customerEmail || !customerName || !items || !total || !paymentMethod || !shippingAddress) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Send thank you email to customer
		const customerEmailResult = await sendOrderThankYouEmail({
			orderId,
			customerEmail,
			customerName,
			items,
			total,
			paymentMethod,
			shippingAddress,
		});

		// Send new order notification to admin
		const adminEmailResult = await sendNewOrderNotificationEmail({
			orderId,
			customerName,
			customerEmail,
			customerPhone: customerPhone || '',
			items,
			total,
			paymentMethod,
			shippingAddress,
		});

		return NextResponse.json({
			success: true,
			customerEmailSent: customerEmailResult.success,
			adminEmailSent: adminEmailResult.success,
		});
	} catch (error: any) {
		console.error('Error sending order emails:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to send emails' },
			{ status: 500 }
		);
	}
}
