import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Fabric from '@/models/FabricModel';

export async function GET() {
	try {
		await dbConnect();
		const fabric = await Fabric.find({});
		return NextResponse.json(fabric);
	} catch (error: unknown) {
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
