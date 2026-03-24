import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Collection } from '@/models/CategoryModel';
import {
	CollectionUpdateSchema,
	CollectionAddProductSchema,
} from '@/lib/validations/categoryValidation';
import {
	updateCollection,
	deleteCollection,
	getCollectionProducts,
	addProductsToCollection,
	removeProductFromCollection,
	evaluateCollectionRules,
} from '@/lib/services/collectionService';
import { handleError, AppError } from '@/lib/utils/errors';

/**
 * GET /api/collections/:id - Fetch single collection
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const collection = await Collection.findById(params.id);
		if (!collection) {
			throw new AppError('Collection not found', 404, 'NOT_FOUND');
		}

		return NextResponse.json({
			success: true,
			data: collection,
			meta: { timestamp: new Date().toISOString() },
		});
	} catch (error) {
		return handleError(error);
	}
}

/**
 * PATCH /api/collections/:id - Update collection
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const body = await req.json();
		const validated = CollectionUpdateSchema.parse(body);

		const collection = await updateCollection(params.id, validated as any);

		return NextResponse.json({
			success: true,
			data: collection,
			meta: { timestamp: new Date().toISOString() },
		});
	} catch (error) {
		return handleError(error);
	}
}

/**
 * DELETE /api/collections/:id - Soft delete collection
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const collection = await deleteCollection(params.id);

		return NextResponse.json({
			success: true,
			data: collection,
			meta: {
				timestamp: new Date().toISOString(),
				message: 'Collection archived',
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
