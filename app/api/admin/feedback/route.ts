import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Feedback from '@/models/FeedbackModel';

// GET - List all feedback with filters
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const sort = searchParams.get('sort') || 'latest';
        const minRating = searchParams.get('minRating');
        const orderId = searchParams.get('orderId');

        const query: any = {};

        if (minRating) {
            query.$or = [
                { fittingRating: { $gte: parseInt(minRating) } },
                { fabricRating: { $gte: parseInt(minRating) } },
                { serviceRating: { $gte: parseInt(minRating) } },
                { deliveryPartnerRating: { $gte: parseInt(minRating) } },
            ];
        }

        if (orderId) {
            query.orderId = orderId;
        }

        let sortQuery: any = {};
        switch (sort) {
            case 'latest':
                sortQuery = { createdAt: -1 };
                break;
            case 'oldest':
                sortQuery = { createdAt: 1 };
                break;
            case 'highestRated':
                sortQuery = { fittingRating: -1, fabricRating: -1, serviceRating: -1 };
                break;
            case 'lowestRated':
                sortQuery = { fittingRating: 1, fabricRating: 1, serviceRating: 1 };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }

        const feedbacks = await Feedback.find(query)
            .populate('orderId', 'orderId total items')
            .populate('customerId', 'customerId firstName lastName email')
            .sort(sortQuery)
            .lean();

        return NextResponse.json(feedbacks);
    } catch (error) {
        console.error('Failed to fetch feedbacks:', error);
        return NextResponse.json({ error: 'Failed to fetch feedbacks' }, { status: 500 });
    }
}
