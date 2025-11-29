import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import mongoose from 'mongoose';

// Temporary storage for reset codes (in production, use Redis or database)
const resetCodes = new Map<string, { code: string; email: string; expiresAt: number }>();

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        await dbConnect();

        // Check if user exists
        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json(
                { error: 'No account found with this email address' },
                { status: 404 }
            );
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Store code with 15-minute expiry
        const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
        resetCodes.set(email, { code, email, expiresAt });

        // In production, send email here
        // For now, log the code (in production, remove this)
        console.log(`Password reset code for ${email}: ${code}`);

        // TODO: Send email with reset code using your email service
        // await sendEmail({
        //   to: email,
        //   subject: 'Password Reset Code',
        //   text: `Your password reset code is: ${code}. This code will expire in 15 minutes.`
        // });

        return NextResponse.json({
            success: true,
            message: 'Reset code sent to your email',
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Export the reset codes map for use in reset-password route
export { resetCodes };
