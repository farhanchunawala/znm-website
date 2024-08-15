import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Inquiry from '@/models/InquiryModel';

interface Context {
	params: undefined;
}

export async function POST(request: NextRequest, context: Context) {
	try {
		await dbConnect();
		const req = await request.json();
		const inquiry = new Inquiry(req);
		await inquiry.save();
		return NextResponse.json({ inquiry });
		// return NextResponse.json(inquiry);
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
