import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/ProductModel';

export async function GET(request: NextRequest, context: Context) {
	try {
		await dbConnect();

		const { id } = context.params;

		const product = await Product.findOne({ productId: id });
		return NextResponse.json(product);
	} catch (error) {
		console.error('Database operation failed:', error);
		return NextResponse.json(
			{ error: 'Database operation failed', details: error.message },
			{
				status: 500,
			}
		);
	}
}
