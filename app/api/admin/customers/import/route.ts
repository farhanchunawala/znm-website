import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            return NextResponse.json({ error: 'CSV file must have headers and at least one row' }, { status: 400 });
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['firstname', 'lastname', 'email', 'phone'];

        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            return NextResponse.json({
                error: `Missing required headers: ${missingHeaders.join(', ')}`
            }, { status: 400 });
        }

        const customers = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row: any = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            try {
                // Check if customer already exists
                const existingCustomer = await Customer.findOne({ phone: row.phone });
                if (existingCustomer) {
                    errors.push({ row: i + 1, error: 'Customer with this phone already exists' });
                    continue;
                }

                // Generate customer ID
                const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });
                let customerNumber = 1;
                if (lastCustomer && lastCustomer.customerId) {
                    const lastNumber = parseInt(lastCustomer.customerId.split('-')[1]);
                    customerNumber = lastNumber + 1;
                }
                const customerId = `znm-${String(customerNumber).padStart(4, '0')}`;

                const newCustomer = new Customer({
                    customerId,
                    firstName: row.firstname,
                    lastName: row.lastname,
                    email: row.email,
                    emails: [row.email],
                    phoneCode: row.phonecode || '+91',
                    phone: row.phone,
                    address: row.address || '',
                    city: row.city || '',
                    state: row.state || '',
                    country: row.country || 'India',
                    zipCode: row.zipcode || '',
                });

                await newCustomer.save();
                customers.push(newCustomer);
            } catch (error: any) {
                errors.push({ row: i + 1, error: error.message });
            }
        }

        return NextResponse.json({
            success: true,
            imported: customers.length,
            errors: errors.length,
            errorDetails: errors,
        });
    } catch (error) {
        console.error('CSV import failed:', error);
        return NextResponse.json({ error: 'CSV import failed' }, { status: 500 });
    }
}
