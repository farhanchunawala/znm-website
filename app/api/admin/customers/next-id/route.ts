import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';

export async function GET(request: NextRequest) {
	try {
		await dbConnect();

		// Find the last customer created to get the global counter
		const lastCustomer = await Customer.findOne().sort({ createdAt: -1 });
		
		let nextNumber = 1;
		
		if (lastCustomer && lastCustomer.customerId) {
			// Extract number from various formats: F-001 or znm-0001
			const parts = lastCustomer.customerId.split('-');
			if (parts.length > 1) {
				const lastNum = parseInt(parts[parts.length - 1]);
				if (!isNaN(lastNum)) {
					nextNumber = lastNum + 1;
				}
			}
		}

		return NextResponse.json({ nextNumber });
	} catch (error) {
		return NextResponse.json({ error: 'Failed' }, { status: 500 });
	}
}
