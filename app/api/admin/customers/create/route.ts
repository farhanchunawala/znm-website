import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const data = await request.json();
        const { firstName, lastName, email, phoneCode, phone, address, city, state, country, zipCode } = data;

        // Validate required fields
        if (!firstName || !lastName || !email || !phone) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if customer with this phone already exists
        const fullPhone = `${phoneCode}${phone}`;
        const existingCustomer = await Customer.findOne({ phone: fullPhone });

        if (existingCustomer) {
            return NextResponse.json({ error: 'Customer with this phone number already exists' }, { status: 400 });
        }

        // Generate customer ID
        const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });
        let customerNumber = 1;
        if (lastCustomer && lastCustomer.customerId) {
            const lastNumber = parseInt(lastCustomer.customerId.split('-')[1]);
            customerNumber = lastNumber + 1;
        }
        const customerId = `znm-${String(customerNumber).padStart(4, '0')}`;

        // Create new customer
        const newCustomer = new Customer({
            customerId,
            firstName,
            lastName,
            email,
            emails: [email],
            phoneCode,
            phone: fullPhone,
            address,
            city,
            state,
            country,
            zipCode,
        });

        await newCustomer.save();

        return NextResponse.json({
            success: true,
            customer: newCustomer,
        });
    } catch (error) {
        console.error('Failed to create customer:', error);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }
}
