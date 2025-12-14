import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { removeProductFromCollection } from '@/lib/services/collectionService';
import { handleError } from '@/lib/utils/errors';

/**
 * DELETE /api/collections/:id/products/:pid - Remove product from collection
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: { id: string; pid: string } }
) {
	try {
		await dbConnect();

		const collection = await removeProductFromCollection(
			params.id,
			params.pid
		);

		return NextResponse.json({
			success: true,
			data: collection,
			meta: {
				timestamp: new Date().toISOString(),
				message: 'Product removed',
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
