import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();
		const customer = await Customer.findById(params.id).lean();
		if (!customer) {
			return NextResponse.json(
				{ error: 'Customer not found' },
				{ status: 404 }
			);
		}
		return NextResponse.json({ success: true, data: customer });
	} catch (error: any) {
		console.error('Failed to get customer:', error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();
		const body = await request.json();
		
		const updatedCustomer = await Customer.findByIdAndUpdate(
			params.id, 
			{ $set: body }, 
			{ new: true, runValidators: true }
		);

		if (!updatedCustomer) {
			return NextResponse.json(
				{ error: 'Customer not found' },
				{ status: 404 }
			);
		}
		return NextResponse.json({ success: true, data: updatedCustomer });
	} catch (error: any) {
		console.error('Failed to update customer:', error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const deletedCustomer = await Customer.findByIdAndDelete(params.id);

		if (!deletedCustomer) {
			return NextResponse.json(
				{ error: 'Customer not found' },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: 'Customer deleted successfully',
		});
	} catch (error: any) {
		console.error('Failed to delete customer:', error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
