import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/CategoryModel';
import { CategoryUpdateSchema } from '@/lib/validations/categoryValidation';
import {
	updateCategory,
	deleteCategory,
	getCategoryWithBreadcrumb,
} from '@/lib/services/categoryService';
import { handleError, AppError } from '@/lib/utils/errors';

/**
 * GET /api/categories/:id - Fetch single category with breadcrumb
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const { category, breadcrumb } = await getCategoryWithBreadcrumb(
			params.id
		);

		return NextResponse.json({
			success: true,
			data: { category, breadcrumb },
			meta: { timestamp: new Date().toISOString() },
		});
	} catch (error) {
		return handleError(error);
	}
}

/**
 * PATCH /api/categories/:id - Update category
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const body = await req.json();
		const validated = CategoryUpdateSchema.parse(body);

		const category = await updateCategory(params.id, validated);

		return NextResponse.json({
			success: true,
			data: category,
			meta: { timestamp: new Date().toISOString() },
		});
	} catch (error) {
		return handleError(error);
	}
}

/**
 * DELETE /api/categories/:id - Soft delete category
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const { searchParams } = new URL(req.url);
		const force = searchParams.get('force') === 'true';

		const category = await deleteCategory(params.id, force);

		return NextResponse.json({
			success: true,
			data: category,
			meta: {
				timestamp: new Date().toISOString(),
				message: 'Category archived',
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
