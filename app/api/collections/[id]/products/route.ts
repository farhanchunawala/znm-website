import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { CollectionAddProductSchema } from '@/lib/validations/categoryValidation';
import {
	getCollectionProducts,
	addProductsToCollection,
	removeProductFromCollection,
	evaluateCollectionRules,
} from '@/lib/services/collectionService';
import { handleError } from '@/lib/utils/errors';

/**
 * GET /api/collections/:id/products - Get collection products with pagination
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const { searchParams } = new URL(req.url);
		const skip = parseInt(searchParams.get('skip') || '0');
		const limit = Math.min(
			100,
			parseInt(searchParams.get('limit') || '50')
		);

		const { products, total } = await getCollectionProducts(
			params.id,
			skip,
			limit
		);

		return NextResponse.json({
			success: true,
			data: products,
			meta: {
				total,
				skip,
				limit,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		return handleError(error);
	}
}

/**
 * POST /api/collections/:id/products - Add products to manual collection
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const body = await req.json();
		const validated = CollectionAddProductSchema.parse(body);

		const collection = await addProductsToCollection(
			params.id,
			validated.productIds
		);

		return NextResponse.json({
			success: true,
			data: collection,
			meta: { timestamp: new Date().toISOString() },
		});
	} catch (error) {
		return handleError(error);
	}
}
