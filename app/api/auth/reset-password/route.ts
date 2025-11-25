import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import bcrypt from 'bcryptjs';

// Import reset codes from forgot-password route
// In production, use a shared database or Redis
const resetCodes = new Map<string, { code: string; email: string; expiresAt: number }>();

export async function POST(request: NextRequest) {
    try {
        const { email, code, newPassword } = await request.json();

        if (!email || !code || !newPassword) {
            return NextResponse.json(
                { error: 'Email, code, and new password are required' },
                { status: 400 }
            );
        }

        // Verify reset code
        const storedData = resetCodes.get(email);

        if (!storedData) {
            return NextResponse.json(
                { error: 'Invalid or expired reset code' },
                { status: 400 }
            );
        }

        if (storedData.code !== code) {
            return NextResponse.json(
                { error: 'Invalid reset code' },
                { status: 400 }
            );
        }

        if (Date.now() > storedData.expiresAt) {
            resetCodes.delete(email);
            return NextResponse.json(
                { error: 'Reset code has expired' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        user.passwordHash = passwordHash;
        await user.save();

        // Delete used reset code
        resetCodes.delete(email);

        return NextResponse.json({
            success: true,
            message: 'Password reset successfully',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
