import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const data = await request.json();
        const { id } = params;

        const updatedCustomer = await Customer.findByIdAndUpdate(
            id,
            {
                $set: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    emails: [data.email],
                    phoneCode: data.phoneCode,
                    phone: `${data.phoneCode}${data.phone}`,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    country: data.country,
                    zipCode: data.zipCode,
                },
            },
            { new: true, runValidators: true }
        );

        if (!updatedCustomer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, customer: updatedCustomer });
    } catch (error) {
        console.error('Failed to update customer:', error);
        return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }
}
