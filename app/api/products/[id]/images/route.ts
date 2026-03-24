import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/ProductModel';
import { processAndSaveImage, deleteImage } from '@/lib/services/imageService';
import { handleError, AppError } from '@/lib/utils/errors';

const MAX_IMAGES_PER_VARIANT = 10;

/**
 * POST /api/products/:id/images - Upload image to product or variant
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await dbConnect();

		const formData = await req.formData();
		const file = formData.get('file') as File;
		const variantId = formData.get('variantId') as string | null;

		if (!file) {
			throw new AppError('No file provided', 400, 'NO_FILE');
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			throw new AppError(
				'File must be an image',
				400,
				'INVALID_FILE_TYPE'
			);
		}

		// Convert File to Buffer
		const buffer = Buffer.from(await file.arrayBuffer());

		// Process and save image with sharp
		const processedImage = await processAndSaveImage(
			buffer,
			file.name,
			file.type
		);

		const product = await Product.findById(params.id);
		if (!product) {
			throw new AppError('Product not found', 404, 'NOT_FOUND');
		}

		// Add to variant or first variant
		if (variantId) {
			const variant = product.variants.find(
				(v) => v._id?.toString() === variantId
			);
			if (!variant) {
				throw new AppError('Variant not found', 404, 'NOT_FOUND');
			}

			if (variant.images.length >= MAX_IMAGES_PER_VARIANT) {
				throw new AppError(
					`Variant cannot have more than ${MAX_IMAGES_PER_VARIANT} images`,
					422,
					'TOO_MANY_IMAGES'
				);
			}

			variant.images.push(processedImage.url);
		} else {
			// Add to first variant
			if (!product.variants.length) {
				throw new AppError(
					'Product must have at least 1 variant',
					422,
					'NO_VARIANTS'
				);
			}

			if (product.variants[0].images.length >= MAX_IMAGES_PER_VARIANT) {
				throw new AppError(
					`Variant cannot have more than ${MAX_IMAGES_PER_VARIANT} images`,
					422,
					'TOO_MANY_IMAGES'
				);
			}

			product.variants[0].images.push(processedImage.url);
		}

		await product.save();

		return NextResponse.json(
			{
				success: true,
				data: processedImage,
				meta: { timestamp: new Date().toISOString() },
			},
			{ status: 201 }
		);
	} catch (error) {
		return handleError(error);
	}
}

/**
 * DELETE /api/products/:id/images/:imgId - Remove image
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: { id: string; imgId: string } }
) {
	try {
		await dbConnect();

		const { searchParams } = new URL(req.url);
		const variantId = searchParams.get('variantId');

		const product = await Product.findById(params.id);
		if (!product) {
			throw new AppError('Product not found', 404, 'NOT_FOUND');
		}

		let imageUrl: string | null = null;

		// Find and remove image
		if (variantId) {
			const variant = product.variants.find(
				(v) => v._id?.toString() === variantId
			);
			if (!variant) {
				throw new AppError('Variant not found', 404, 'NOT_FOUND');
			}

			// Find image by URL containing imgId
			const idx = variant.images.findIndex((img) =>
				img.includes(params.imgId)
			);
			if (idx < 0) {
				throw new AppError('Image not found', 404, 'NOT_FOUND');
			}

			imageUrl = variant.images[idx];
			variant.images.splice(idx, 1);
		} else {
			// Find in first variant
			if (product.variants.length > 0) {
				const idx = product.variants[0].images.findIndex((img) =>
					img.includes(params.imgId)
				);
				if (idx < 0) {
					throw new AppError('Image not found', 404, 'NOT_FOUND');
				}

				imageUrl = product.variants[0].images[idx];
				product.variants[0].images.splice(idx, 1);
			} else {
				throw new AppError(
					'Product has no variants',
					404,
					'NO_VARIANTS'
				);
			}
		}

		await product.save();

		// Delete physical files
		if (imageUrl) {
			const filename = imageUrl.split('/').pop() || '';
			await deleteImage(filename);
		}

		return NextResponse.json({
			success: true,
			data: null,
			meta: {
				timestamp: new Date().toISOString(),
				message: 'Image deleted',
			},
		});
	} catch (error) {
		return handleError(error);
	}
}
