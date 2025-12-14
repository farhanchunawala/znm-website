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
			throw new AppError('No file provided', 'NO_FILE', 400);
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			throw new AppError(
				'File must be an image',
				'INVALID_FILE_TYPE',
				400
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
			throw new AppError('Product not found', 'NOT_FOUND', 404);
		}

		// Add to variant or first variant
		if (variantId) {
			const variant = product.variants.find(
				(v) => v._id?.toString() === variantId
			);
			if (!variant) {
				throw new AppError('Variant not found', 'NOT_FOUND', 404);
			}

			if (variant.images.length >= MAX_IMAGES_PER_VARIANT) {
				throw new AppError(
					`Variant cannot have more than ${MAX_IMAGES_PER_VARIANT} images`,
					'TOO_MANY_IMAGES',
					422
				);
			}

			variant.images.push(processedImage.url);
		} else {
			// Add to first variant
			if (!product.variants.length) {
				throw new AppError(
					'Product must have at least 1 variant',
					'NO_VARIANTS',
					422
				);
			}

			if (product.variants[0].images.length >= MAX_IMAGES_PER_VARIANT) {
				throw new AppError(
					`Variant cannot have more than ${MAX_IMAGES_PER_VARIANT} images`,
					'TOO_MANY_IMAGES',
					422
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
			throw new AppError('Product not found', 'NOT_FOUND', 404);
		}

		let imageUrl: string | null = null;

		// Find and remove image
		if (variantId) {
			const variant = product.variants.find(
				(v) => v._id?.toString() === variantId
			);
			if (!variant) {
				throw new AppError('Variant not found', 'NOT_FOUND', 404);
			}

			// Find image by URL containing imgId
			const idx = variant.images.findIndex((img) =>
				img.includes(params.imgId)
			);
			if (idx < 0) {
				throw new AppError('Image not found', 'NOT_FOUND', 404);
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
					throw new AppError('Image not found', 'NOT_FOUND', 404);
				}

				imageUrl = product.variants[0].images[idx];
				product.variants[0].images.splice(idx, 1);
			} else {
				throw new AppError(
					'Product has no variants',
					'NO_VARIANTS',
					404
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
