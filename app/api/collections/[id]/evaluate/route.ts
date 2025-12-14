import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Collection } from '@/models/CategoryModel';
import { evaluateCollectionRules } from '@/lib/services/collectionService';
import { handleError, AppError } from '@/lib/utils/errors';

/**
 * POST /api/collections/:id/evaluate - Evaluate dynamic collection rules
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const collection = await Collection.findById(params.id);
		if (!collection) {
			throw new AppError('Collection not found', 'NOT_FOUND', 404);
		}

		if (collection.type !== 'dynamic') {
			throw new AppError(
				'Collection must be dynamic to evaluate rules',
				'INVALID_TYPE',
				422
			);
		}

		await evaluateCollectionRules(collection);

		return NextResponse.json({
			success: true,
			data: {
				collectionId: collection._id,
				matchedProducts: collection.cachedProductIds?.length || 0,
				evaluatedAt: collection.cachedAt,
			},
			meta: {
				timestamp: new Date().toISOString(),
				message: 'Rules evaluated',
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
