import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Feedback from '@/models/FeedbackModel';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';
import { verifyFeedbackToken } from '@/lib/utils/feedbackToken';

// GET - Verify feedback token and get order details
export async function GET(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        await dbConnect();
        const { token } = params;

        const payload = await verifyFeedbackToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid or expired feedback link' }, { status: 401 });
        }

        const order = await Order.findById(payload.orderId);
        const customer = await Customer.findById(payload.customerId);

        if (!order || !customer) {
            return NextResponse.json({ error: 'Order or customer not found' }, { status: 404 });
        }

        // Check if feedback already submitted
        const existingFeedback = await Feedback.findOne({ orderId: payload.orderId });

        return NextResponse.json({
            order: {
                orderId: order.orderId,
                items: order.items,
                total: order.total,
                deliveredAt: order.deliveredAt,
            },
            customer: {
                firstName: customer.firstName,
                lastName: customer.lastName,
            },
            feedbackSubmitted: !!existingFeedback,
        });
    } catch (error: any) {
        console.error('Failed to verify feedback token:', error);
        return NextResponse.json({ error: error.message || 'Failed to verify feedback token' }, { status: 500 });
    }
}
