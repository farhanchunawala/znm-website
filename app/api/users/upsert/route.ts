import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';

interface Context {
	params: undefined;
}

export async function POST(request: NextRequest, context: Context) {
	try {
		await dbConnect();
		const req = await request.json();
		const user = new User(req);
		await user.save();
		return NextResponse.json({ user });
		// return NextResponse.json(user);
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
