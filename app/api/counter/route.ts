import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest, context) {
	const body: { amount: number } = await request.json();
	const { amount = 1 } = body;

	// simulate IO latency
	await new Promise((resolve) => setTimeout(resolve, 500));

	return NextResponse.json({ data: amount });
}
