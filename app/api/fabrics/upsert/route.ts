import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Fabric from '@/models/FabricModel';

interface Context {
	params: undefined;
}

export async function POST(request: NextRequest, context: Context) {
	try {
		await dbConnect();
		const req = await request.json();
		const fabric = new Fabric(req);
		await fabric.save();
		return NextResponse.json({ fabric });
		// return NextResponse.json(fabric);
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
