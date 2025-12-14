import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/ProductModel';
import { ProductUpdateSchema } from '@/lib/validations/productValidation';
import {
	getProductWithDetails,
	softDeleteProduct,
	generateSlug,
} from '@/lib/services/productService';
import { handleError, AppError } from '@/lib/utils/errors';

/**
 * GET /api/products/:id - Fetch single product with details
 */
export async function GET(
	request: NextRequest,
	context: { params: { id: string } }
) {
	try {
		await dbConnect();

		const { id } = context.params;
		const product = await getProductWithDetails(id);

		if (!product) {
			throw new AppError('Product not found', 'NOT_FOUND', 404);
		}

		return NextResponse.json({
			success: true,
			data: product,
			meta: { timestamp: new Date().toISOString() },
		});
	} catch (error) {
		return handleError(error);
	}
}

/**
 * PATCH /api/products/:id - Update product
 */
export async function PATCH(
	request: NextRequest,
	context: { params: { id: string } }
) {
	try {
		await dbConnect();

		const { id } = context.params;
		const body = await request.json();
		const validated = ProductUpdateSchema.parse(body);

		// Generate new slug if title changed
		let updateData: any = { ...validated };
		if (validated.title) {
			updateData.slug = await generateSlug(validated.title, id);
		}

		const product = await Product.findByIdAndUpdate(id, updateData, {
			new: true,
			runValidators: true,
		});

		if (!product) {
			throw new AppError('Product not found', 'NOT_FOUND', 404);
		}

		return NextResponse.json({
			success: true,
			data: product,
			meta: { timestamp: new Date().toISOString() },
		});
	} catch (error) {
		return handleError(error);
	}
}

/**
 * DELETE /api/products/:id - Soft delete product
 */
export async function DELETE(
	request: NextRequest,
	context: { params: { id: string } }
) {
	try {
		await dbConnect();

		const { id } = context.params;
		const product = await softDeleteProduct(id);

		return NextResponse.json({
			success: true,
			data: product,
			meta: {
				timestamp: new Date().toISOString(),
				message: 'Product archived',
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
