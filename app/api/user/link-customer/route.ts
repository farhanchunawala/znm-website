import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import Customer from '@/models/CustomerModel';
import { getCurrentUser } from '@/lib/auth';

/**
 * Link user account with customer record using phone number matching
 */
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const user = await User.findById(currentUser.userId);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if user already has a customer ID
        if (user.customerId) {
            return NextResponse.json({
                success: true,
                customerId: user.customerId,
                message: 'Already linked to customer account',
            });
        }

        // Try to find customer by phone number
        if (!user.phone) {
            return NextResponse.json(
                { error: 'Phone number required to link customer account' },
                { status: 400 }
            );
        }

        // Look for customer with matching phone
        let customer = await Customer.findOne({ phone: user.phone });

        if (!customer) {
            // Try matching last 10 digits if phone is long enough (to handle country code differences)
            // Remove non-digits/characters to get clean number
            const cleanPhone = user.phone.replace(/\D/g, '');

            if (cleanPhone.length >= 10) {
                const last10 = cleanPhone.slice(-10);
                // Search for phone ending with these 10 digits
                customer = await Customer.findOne({
                    phone: { $regex: new RegExp(`${last10}$`) }
                });
            }
        }

        if (!customer) {
            return NextResponse.json(
                { error: 'No customer account found with this phone number' },
                { status: 404 }
            );
        }

        // Generate customer ID if not exists (format: ZNM-XXXX)
        if (!customer.customerId) {
            // Count existing customers to generate sequential ID
            const customerCount = await Customer.countDocuments();
            customer.customerId = `ZNM-${String(customerCount + 1).padStart(4, '0')}`;
        }

        // Link the accounts
        user.customerId = customer.customerId;
        customer.userId = user._id;

        // Add user email to customer emails if not already there
        if (!customer.emails.includes(user.email)) {
            customer.emails.push(user.email);
        }

        await user.save();
        await customer.save();

        return NextResponse.json({
            success: true,
            customerId: customer.customerId,
            message: 'Successfully linked to customer account',
            customer: {
                customerId: customer.customerId,
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone: customer.phone,
            },
        });
    } catch (error) {
        console.error('Customer linking error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Get customer link status
 */
export async function GET() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const user = await User.findById(currentUser.userId);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.customerId) {
            return NextResponse.json({
                linked: false,
                customerId: null,
            });
        }

        const customer = await Customer.findOne({ customerId: user.customerId });

        return NextResponse.json({
            linked: true,
            customerId: user.customerId,
            customer: customer
                ? {
                    customerId: customer.customerId,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    phone: customer.phone,
                }
                : null,
        });
    } catch (error) {
        console.error('Customer link status error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
