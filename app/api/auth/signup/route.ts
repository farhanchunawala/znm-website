import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import Customer from '@/models/CustomerModel';
import bcrypt from 'bcryptjs';
import { createToken, setAuthCookie } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, email, phone, phoneCode, password } = body;

        // Validate input
        if (!username || !email || !password || !phone) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Connect to database
        await dbConnect();

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email or phone already exists' },
                { status: 409 }
            );
        }

        // Generate customer ID
        const customerCount = await Customer.countDocuments();
        const customerId = `ZNM-${String(customerCount + 1).padStart(4, '0')}`;

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create new user with customer ID
        const newUser = await User.create({
            name: {
                firstName: username,
                middleName: '',
                lastName: '',
            },
            email,
            phone,
            passwordHash,
            customerId,
        });

        // Create customer record
        await Customer.create({
            customerId,
            userId: newUser._id,
            emails: [email],
            phoneCode: phoneCode || '+91',
            phone,
            firstName: username,
            lastName: '',
        });

        // Create JWT token
        const token = await createToken({
            userId: newUser._id.toString(),
            email: newUser.email,
        });

        // Set cookie
        await setAuthCookie(token);

        // Send welcome email (non-blocking)
        sendWelcomeEmail(email, username).catch(err =>
            console.error('Failed to send welcome email:', err)
        );

        return NextResponse.json({
            success: true,
            message: 'Thank you for joining us! Welcome to Zoll & Metér.',
            user: {
                id: newUser._id,
                email: newUser.email,
                name: newUser.name,
                customerId: newUser.customerId,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
