import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { CollectionCreateSchema } from '@/lib/validations/categoryValidation';
import {
	createCollection,
	searchCollections,
	getActiveCollections,
} from '@/lib/services/collectionService';
import { handleError } from '@/lib/utils/errors';

/**
 * POST /api/collections - Create collection
 */
export async function POST(req: NextRequest) {
	try {
		await dbConnect();

		const body = await req.json();
		const validated = CollectionCreateSchema.parse(body);

		const collection = await createCollection(validated);

		return NextResponse.json(
			{
				success: true,
				data: collection,
				meta: { timestamp: new Date().toISOString() },
			},
			{ status: 201 }
		);
	} catch (error) {
		return handleError(error);
	}
}

/**
 * GET /api/collections - List collections with filters
 */
export async function GET(req: NextRequest) {
	try {
		await dbConnect();

		const { searchParams } = new URL(req.url);

		const q = searchParams.get('q') || '';
		const type = (searchParams.get('type') as any) || undefined;
		const status = (searchParams.get('status') as any) || 'active';
		const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
		const limit = Math.min(
			100,
			parseInt(searchParams.get('limit') || '10')
		);
		const skip = (page - 1) * limit;

		const { collections, total } = await searchCollections(q, {
			type,
			status,
			skip,
			limit,
		});

		return NextResponse.json({
			success: true,
			data: collections,
			meta: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
