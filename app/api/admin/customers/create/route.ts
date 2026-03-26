import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';

export async function POST(request: NextRequest) {
	try {
		await dbConnect();

		const data = await request.json();
		const {
			firstName,
			lastName,
			email,
			phoneCode,
			phone,
			address,
			city,
			state,
			country,
			zipCode,
		} = data;

		// Validate required fields
		if (!firstName || !lastName || !email || !phone) {
			return NextResponse.json(
				{ error: 'Missing required fields' },
				{ status: 400 }
			);
		}

		// Check if customer with this phone already exists
		const fullPhone = `${phoneCode}${phone}`;
		const existingCustomer = await Customer.findOne({ phone: fullPhone });

		if (existingCustomer) {
			return NextResponse.json(
				{ error: 'Customer with this phone number already exists' },
				{ status: 400 }
			);
		}

		// Generate customer ID if not provided
		let customerId = data.customerId;

		if (!customerId) {
			const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });
			let customerNumber = 1;
			if (lastCustomer && lastCustomer.customerId && lastCustomer.customerId.startsWith('znm-')) {
				const lastNumberStr = lastCustomer.customerId.split('-')[1];
				const lastNumber = parseInt(lastNumberStr) || 0;
				customerNumber = lastNumber + 1;
			}
			customerId = `znm-${String(customerNumber).padStart(4, '0')}`;
		}

		// Create new customer
		const newCustomer = new Customer({
			customerId,
			name: `${firstName} ${lastName}`.trim(),
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
	} catch (error: any) {
		console.error('Failed to create customer:', error);
		
		// Handle Mongo Duplicate Key Error
		if (error.code === 11000) {
			const field = Object.keys(error.keyPattern)[0];
			const message = field === 'customerId' 
				? 'Customer ID already exists' 
				: field === 'phone' 
				? 'Phone number already exists' 
				: field === 'email' 
				? 'Email already exists' 
				: 'A customer with this information already exists';
			
			return NextResponse.json(
				{ error: message },
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: 'Failed to create customer' },
			{ status: 500 }
		);
	}
}
