import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/CategoryModel';
import {
	CategoryCreateSchema,
	CategoryUpdateSchema,
	CategoryReorderSchema,
} from '@/lib/validations/categoryValidation';
import {
	generateCategorySlug,
	buildAncestors,
	createCategory,
	updateCategory,
	getCategoryTree,
	reorderCategories,
	deleteCategory,
	getCategoryWithBreadcrumb,
} from '@/lib/services/categoryService';
import { handleError, AppError } from '@/lib/utils/errors';

/**
 * POST /api/categories - Create category
 */
export async function POST(req: NextRequest) {
	try {
		await dbConnect();

		const body = await req.json();
		const validated = CategoryCreateSchema.parse(body);

		const category = await createCategory(validated);

		return NextResponse.json(
			{
				success: true,
				data: category,
				meta: { timestamp: new Date().toISOString() },
			},
			{ status: 201 }
		);
	} catch (error) {
		return handleError(error);
	}
}

/**
 * GET /api/categories - List categories as tree or flat
 */
export async function GET(req: NextRequest) {
	try {
		await dbConnect();

		const { searchParams } = new URL(req.url);
		const flat = searchParams.get('flat') === 'true';

		const categories = await getCategoryTree(flat);

		return NextResponse.json({
			success: true,
			data: categories,
			meta: {
				timestamp: new Date().toISOString(),
				count: categories.length,
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
