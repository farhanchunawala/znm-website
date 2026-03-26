import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';

export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return NextResponse.json({ exists: false });
		}

		// Check if this EXACT ID exists
		let customer = await Customer.findOne({ customerId: id });
		
		if (!customer && id.includes('-')) {
			// Check if the NUMBER part exists with ANY other initial
			const parts = id.split('-');
			const numPart = parts[parts.length - 1];
			// Matches any ID ending with the same number (e.g. F-001 if id is S-001)
			customer = await Customer.findOne({ 
				customerId: { $regex: new RegExp(`-${numPart}$`) } 
			});
		}

		return NextResponse.json({ 
			exists: !!customer, 
			existingId: customer?.customerId || null 
		});
	} catch (error) {
		return NextResponse.json({ error: 'Failed' }, { status: 500 });
	}
}
