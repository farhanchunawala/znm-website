import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/ProductModel';

export async function GET(
	request: NextRequest,
	context: { params: { id: string } }
) {
	try {
		await dbConnect();

		const { id } = context.params;

		const product = await Product.findOne({ productId: id });
		return NextResponse.json(product);
	} catch (error) {
		console.error('Database operation failed:', error);
		// Safely handle unknown errors
		let message = 'Unknown error';
		if (error instanceof Error) {
			message = error.message;
		}

		return NextResponse.json(
			{ error: 'Database operation failed', details: message },
			{
				status: 500,
			}
		);
	}
}
