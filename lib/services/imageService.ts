import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export interface ProcessedImage {
	url: string;
	thumbnail: string;
	width: number;
	height: number;
	size: number;
	format: string;
}

/**
 * Process and save uploaded image with optimization
 */
export async function processAndSaveImage(
	buffer: Buffer,
	filename: string,
	mimeType: string
): Promise<ProcessedImage> {
	// Validate file
	if (!ALLOWED_TYPES.includes(mimeType)) {
		throw new Error(
			`File type ${mimeType} not allowed. Allowed: JPEG, PNG, WebP, AVIF`
		);
	}

	if (buffer.length > MAX_FILE_SIZE) {
		throw new Error(
			`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
		);
	}

	// Create upload directory
	try {
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
	} catch (error) {
		// Directory might already exist
	}

	// Generate unique filename
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(7);
	const name = `${timestamp}-${random}`;
	const ext = getFileExtension(mimeType);

	// Process main image
	const mainPath = path.join(UPLOAD_DIR, `${name}.${ext}`);
	const thumbPath = path.join(UPLOAD_DIR, `${name}-thumb.${ext}`);

	// Optimize and save main image
	const mainImage = sharp(buffer);
	const mainMetadata = await mainImage.metadata();

	await mainImage
		.resize(1200, 1200, {
			fit: 'inside',
			withoutEnlargement: true,
		})
		.toFormat(
			mimeType === 'image/jpeg' ? 'jpeg' : getFormatFromMime(mimeType),
			{
				quality: 85,
			}
		)
		.toFile(mainPath);

	// Optimize and save thumbnail
	await sharp(buffer)
		.resize(300, 300, {
			fit: 'cover',
		})
		.toFormat(getFormatFromMime(mimeType), {
			quality: 80,
		})
		.toFile(thumbPath);

	// Get main image info
	const mainStats = await fs.stat(mainPath);

	return {
		url: `/uploads/products/${name}.${ext}`,
		thumbnail: `/uploads/products/${name}-thumb.${ext}`,
		width: mainMetadata.width || 0,
		height: mainMetadata.height || 0,
		size: mainStats.size,
		format: mainMetadata.format || 'unknown',
	};
}

/**
 * Delete image and thumbnail
 */
export async function deleteImage(filename: string): Promise<void> {
	try {
		// Extract name without extension
		const name = filename.replace(/\.[^.]+$/, '');
		const ext = filename.split('.').pop() || 'jpg';

		const mainPath = path.join(UPLOAD_DIR, `${name}.${ext}`);
		const thumbPath = path.join(UPLOAD_DIR, `${name}-thumb.${ext}`);

		// Delete both files
		await Promise.all([
			fs.unlink(mainPath).catch(() => {}), // Ignore if not found
			fs.unlink(thumbPath).catch(() => {}),
		]);
	} catch (error) {
		console.error('Error deleting image:', error);
		// Don't throw - file might already be deleted
	}
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
	const map: Record<string, string> = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/webp': 'webp',
		'image/avif': 'avif',
	};
	return map[mimeType] || 'jpg';
}

/**
 * Get sharp format from MIME type
 */
function getFormatFromMime(mimeType: string): 'jpeg' | 'png' | 'webp' | 'avif' {
	const map: Record<string, 'jpeg' | 'png' | 'webp' | 'avif'> = {
		'image/jpeg': 'jpeg',
		'image/png': 'png',
		'image/webp': 'webp',
		'image/avif': 'avif',
	};
	return map[mimeType] || 'jpeg';
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(
	buffer: Buffer,
	minWidth: number = 400,
	minHeight: number = 400
): Promise<boolean> {
	try {
		const metadata = await sharp(buffer).metadata();
		return (
			(metadata.width || 0) >= minWidth &&
			(metadata.height || 0) >= minHeight
		);
	} catch (error) {
		return false;
	}
}

/**
 * Generate image variants for different sizes (e.g., for responsive images)
 */
export async function generateImageVariants(
	buffer: Buffer,
	baseUrl: string,
	sizes: number[] = [640, 960, 1280]
): Promise<Record<number, string>> {
	const variants: Record<number, string> = {};

	for (const size of sizes) {
		// Generate variant (not saved, just URLs for now)
		// In production, you'd save these files
		variants[size] = `${baseUrl}?w=${size}`;
	}

	return variants;
}
