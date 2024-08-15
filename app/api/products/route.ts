import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/ProductModel';

export async function GET() {
	try {
		await dbConnect();
		const product = await Product.find({});
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
