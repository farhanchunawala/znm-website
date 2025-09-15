import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/ProductModel';

export async function POST(request: NextRequest) {
	try {
		await dbConnect();
		const req = await request.json();
		const product = new Product(req);
		await product.save();
		return NextResponse.json({ product });
		// return NextResponse.json(product);
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
