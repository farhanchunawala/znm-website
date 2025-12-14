import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { CategoryReorderSchema } from '@/lib/validations/categoryValidation';
import { reorderCategories } from '@/lib/services/categoryService';
import { handleError } from '@/lib/utils/errors';

/**
 * POST /api/categories/reorder - Reorder categories
 */
export async function POST(req: NextRequest) {
	try {
		await dbConnect();

		const body = await req.json();
		const validated = CategoryReorderSchema.parse(body);

		await reorderCategories(validated);

		return NextResponse.json({
			success: true,
			data: null,
			meta: {
				timestamp: new Date().toISOString(),
				message: 'Categories reordered',
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
