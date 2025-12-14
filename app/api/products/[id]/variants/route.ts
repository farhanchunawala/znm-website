import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/ProductModel';
import {
	VariantSchema,
	VariantUpdateSchema,
} from '@/lib/validations/productValidation';
import {
	generateVariantSKU,
	addVariantToProduct,
	removeVariantFromProduct,
	normalizeOption,
	isSKUUnique,
} from '@/lib/services/productService';
import { handleError, AppError } from '@/lib/utils/errors';

/**
 * POST /api/products/:id/variants - Add variant to product
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const body = await req.json();
		let validated = VariantSchema.parse(body);

		const product = await Product.findById(params.id);
		if (!product) {
			throw new AppError('Product not found', 'NOT_FOUND', 404);
		}

		// Normalize options
		validated.options = validated.options.map((opt) =>
			normalizeOption(opt.name, opt.value)
		);

		// Generate variant SKU if not provided
		if (!validated.sku) {
			validated.sku = await generateVariantSKU(
				product.sku,
				validated.options,
				params.id
			);
		} else {
			// Check SKU uniqueness
			const isUnique = await isSKUUnique(validated.sku, params.id, true);
			if (!isUnique) {
				throw new AppError(
					`Variant SKU '${validated.sku}' already exists`,
					'SKU_EXISTS',
					409
				);
			}
		}

		// Add variant
		const updatedProduct = await addVariantToProduct(params.id, validated);

		return NextResponse.json(
			{
				success: true,
				data: updatedProduct,
				meta: { timestamp: new Date().toISOString() },
			},
			{ status: 201 }
		);
	} catch (error) {
		return handleError(error);
	}
}

/**
 * PATCH /api/products/:id/variants/:variantId - Update variant
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string; variantId: string } }
) {
	try {
		await dbConnect();

		const body = await req.json();
		const validated = VariantUpdateSchema.parse(body);

		const product = await Product.findById(params.id);
		if (!product) {
			throw new AppError('Product not found', 'NOT_FOUND', 404);
		}

		// Find variant
		const variantIdx = product.variants.findIndex(
			(v) => v._id?.toString() === params.variantId
		);

		if (variantIdx < 0) {
			throw new AppError('Variant not found', 'NOT_FOUND', 404);
		}

		// Normalize options if provided
		if (validated.options) {
			validated.options = validated.options.map((opt) =>
				normalizeOption(opt.name, opt.value)
			);
		}

		// Check SKU uniqueness if changed
		if (
			validated.sku &&
			validated.sku !== product.variants[variantIdx].sku
		) {
			const isUnique = await isSKUUnique(validated.sku, params.id, true);
			if (!isUnique) {
				throw new AppError(
					`Variant SKU '${validated.sku}' already exists`,
					'SKU_EXISTS',
					409
				);
			}
		}

		// Merge updates
		product.variants[variantIdx] = {
			...product.variants[variantIdx],
			...validated,
		};

		await product.save();

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
 * DELETE /api/products/:id/variants/:variantId - Remove variant
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: { id: string; variantId: string } }
) {
	try {
		await dbConnect();

		const product = await removeVariantFromProduct(
			params.id,
			params.variantId
		);

		return NextResponse.json({
			success: true,
			data: product,
			meta: {
				timestamp: new Date().toISOString(),
				message: 'Variant removed',
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
