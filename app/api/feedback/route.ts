import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Feedback from '@/models/FeedbackModel';
import { verifyFeedbackToken } from '@/lib/utils/feedbackToken';

// POST - Submit feedback
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { token, fittingRating, fabricRating, serviceRating, deliveryPartnerRating, fittingComment, fabricComment, serviceComment, deliveryComment } = await request.json();

        // Verify token
        const payload = await verifyFeedbackToken(token);
        if (!payload) {
            return NextResponse.json({ error: 'Invalid or expired feedback link' }, { status: 401 });
        }

        // Check if feedback already exists
        const existingFeedback = await Feedback.findOne({ orderId: payload.orderId });
        if (existingFeedback) {
            return NextResponse.json({ error: 'Feedback already submitted for this order' }, { status: 400 });
        }

        // Create feedback
        const feedback = await Feedback.create({
            orderId: payload.orderId,
            customerId: payload.customerId,
            fittingRating,
            fabricRating,
            serviceRating,
            deliveryPartnerRating,
            fittingComment,
            fabricComment,
            serviceComment,
            deliveryComment,
        });

        return NextResponse.json({
            success: true,
            message: 'Thank you for your feedback!',
            feedback,
        });
    } catch (error: any) {
        console.error('Failed to submit feedback:', error);
        return NextResponse.json({ error: error.message || 'Failed to submit feedback' }, { status: 500 });
    }
}
