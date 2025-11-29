import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Newsletter from '@/models/NewsletterModel';
import { sendBroadcastEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        // Fetch all active newsletter subscribers
        const subscribers = await Newsletter.find({ active: { $ne: false } })
            .select('email subscribedAt')
            .sort({ subscribedAt: -1 })
            .lean();

        return NextResponse.json({
            subscribers,
            count: subscribers.length,
        });
    } catch (error) {
        console.error('Failed to fetch subscribers:', error);
        return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { subject, message, testMode, testEmail } = await request.json();

        if (!subject || !message) {
            return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
        }

        if (testMode) {
            // Send test email
            if (!testEmail) {
                return NextResponse.json({ error: 'Test email is required' }, { status: 400 });
            }

            await sendBroadcastEmail([testEmail], subject, message);

            return NextResponse.json({
                success: true,
                message: `Test email sent to ${testEmail}`,
            });
        } else {
            // Send to all subscribers
            const subscribers = await Newsletter.find({ active: { $ne: false } })
                .select('email')
                .lean();

            if (subscribers.length === 0) {
                return NextResponse.json({ error: 'No active subscribers found' }, { status: 400 });
            }

            const emails = subscribers.map(sub => sub.email);

            // Send broadcast email (this will be async in production)
            await sendBroadcastEmail(emails, subject, message);

            return NextResponse.json({
                success: true,
                message: `Broadcast sent to ${emails.length} subscribers`,
                count: emails.length,
            });
        }
    } catch (error) {
        console.error('Failed to send broadcast:', error);
        return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
    }
}
