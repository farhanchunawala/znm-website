import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';

export async function POST(request: NextRequest, context) {
	try {
		await dbConnect();
		const req = await request.json();
		const user = new User(req);
		await user.save();
		return NextResponse.json({ user });
		// return NextResponse.json(user);
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
