import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Newsletter from '@/models/NewsletterModel';
import { sendNewsletterAdminNotification, sendNewsletterUserThankYou } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if already subscribed
        const existing = await Newsletter.findOne({ email });

        if (existing) {
            if (!existing.active) {
                // Reactivate if previously unsubscribed
                existing.active = true;
                await existing.save();
                return NextResponse.json({
                    success: true,
                    message: 'Welcome back! You have been resubscribed.',
                });
            }
            return NextResponse.json({
                success: true,
                message: 'You are already subscribed!',
            });
        }

        // Create new subscription
        await Newsletter.create({ email });

        // Send notifications (non-blocking)
        Promise.all([
            sendNewsletterAdminNotification(email),
            sendNewsletterUserThankYou(email)
        ]).catch(err => console.error('Failed to send newsletter emails:', err));

        return NextResponse.json({
            success: true,
            message: 'Successfully subscribed to newsletter!',
        }, { status: 201 });

    } catch (error) {
        console.error('Newsletter subscription error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
