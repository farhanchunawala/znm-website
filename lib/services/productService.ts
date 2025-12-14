import slugify from 'slug';
import Product, { IProduct, IVariant } from '@/models/ProductModel';
import dbConnect from '@/lib/mongodb';
import { AppError } from '@/lib/utils/errors';

/**
 * Generate unique slug with collision handling
 */
export async function generateSlug(
	title: string,
	productId?: string
): Promise<string> {
	await dbConnect();

	let slug = slugify(title, { lower: true, strict: true });
	let counter = 1;
	let finalSlug = slug;

	// Check for existing slug
	const query: any = { slug: finalSlug };
	if (productId) {
		query._id = { $ne: productId }; // Exclude current product
	}

	while (await Product.findOne(query)) {
		finalSlug = `${slug}-${counter}`;
		query.slug = finalSlug;
		counter++;
	}

	return finalSlug;
}

/**
 * Generate unique master SKU
 */
export async function generateMasterSKU(
	title: string,
	productId?: string
): Promise<string> {
	await dbConnect();

	// Extract initials or first 3 chars of each word
	const words = title.split(' ').filter((w) => w.length > 0);
	let baseSku = words
		.map((w) => w.charAt(0).toUpperCase())
		.join('')
		.substring(0, 3);

	if (baseSku.length < 3) {
		baseSku = title.substring(0, 3).toUpperCase();
	}

	// Add timestamp suffix
	const timestamp = Date.now().toString().slice(-6);
	let sku = `${baseSku}-${timestamp}`;
	let counter = 1;

	const query: any = { sku };
	if (productId) {
		query._id = { $ne: productId };
	}

	while (await Product.findOne(query)) {
		sku = `${baseSku}-${timestamp}-${counter}`;
		query.sku = sku;
		counter++;
	}

	return sku;
}

/**
 * Generate variant SKU based on product SKU and options
 */
export async function generateVariantSKU(
	masterSKU: string,
	options: Array<{ name: string; value: string }>,
	productId?: string
): Promise<string> {
	await dbConnect();

	// Create SKU from master + option values
	const optionStr = options
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((o) => o.value.substring(0, 2).toUpperCase())
		.join('');

	let variantSku = `${masterSKU}-${optionStr}`;
	let counter = 1;

	const query: any = { 'variants.sku': variantSku };
	if (productId) {
		query._id = { $ne: productId };
	}

	while (await Product.findOne(query)) {
		variantSku = `${masterSKU}-${optionStr}-${counter}`;
		query['variants.sku'] = variantSku;
		counter++;
	}

	return variantSku;
}

/**
 * Validate pricing logic
 */
export function validatePricing(price: number, comparePrice?: number): void {
	if (price <= 0) {
		throw new AppError('Price must be greater than 0', 'INVALID_PRICE');
	}

	if (comparePrice && comparePrice < price) {
		throw new AppError(
			'Compare price (MRP) must be greater than or equal to selling price',
			'INVALID_COMPARE_PRICE'
		);
	}
}

/**
 * Validate product can be published
 */
export async function validatePublish(productId: string): Promise<IProduct> {
	await dbConnect();

	const product = await Product.findById(productId);
	if (!product) {
		throw new AppError('Product not found', 'NOT_FOUND', 404);
	}

	if (!product.title || product.title.trim().length === 0) {
		throw new AppError(
			'Product must have a title before publishing',
			'MISSING_TITLE',
			422
		);
	}

	if (!product.variants || product.variants.length === 0) {
		throw new AppError(
			'Product must have at least 1 variant before publishing',
			'NO_VARIANTS',
			422
		);
	}

	// Validate all variants have valid pricing
	for (const variant of product.variants) {
		validatePricing(variant.price, variant.comparePrice);
		if (!variant.sku) {
			throw new AppError(
				`Variant missing SKU: ${variant._id}`,
				'VARIANT_MISSING_SKU',
				422
			);
		}
	}

	return product;
}

/**
 * Prevent deletion if product is in active orders
 */
export async function canDeleteProduct(productId: string): Promise<boolean> {
	await dbConnect();

	// Check if product is referenced in active/pending orders
	// Import Order model when available
	try {
		const OrderModel = await import('@/models/OrderModel').then(
			(m) => m.default
		);
		const activeOrder = await OrderModel.findOne({
			'items.productId': productId,
			status: { $in: ['pending', 'processing', 'shipped'] },
		});

		if (activeOrder) {
			throw new AppError(
				'Cannot delete product with active orders',
				'PRODUCT_IN_USE',
				409
			);
		}
	} catch (err) {
		// If Order model doesn't exist yet, allow deletion
		if ((err as any).code !== 'MODULE_NOT_FOUND') {
			throw err;
		}
	}

	return true;
}

/**
 * Soft delete product (archive it)
 */
export async function softDeleteProduct(productId: string): Promise<IProduct> {
	await dbConnect();

	await canDeleteProduct(productId);

	const product = await Product.findByIdAndUpdate(
		productId,
		{ status: 'archived' },
		{ new: true }
	);

	if (!product) {
		throw new AppError('Product not found', 'NOT_FOUND', 404);
	}

	return product;
}

/**
 * Check SKU uniqueness globally and per-product
 */
export async function isSKUUnique(
	sku: string,
	productId?: string,
	isVariant = false
): Promise<boolean> {
	await dbConnect();

	const query: any = isVariant ? { 'variants.sku': sku } : { sku };

	if (productId) {
		query._id = { $ne: productId };
	}

	const exists = await Product.findOne(query);
	return !exists;
}

/**
 * Normalize option values (lowercase, trim, slug)
 */
export function normalizeOption(
	name: string,
	value: string
): { name: string; value: string } {
	return {
		name: name.toLowerCase().trim(),
		value: value.toLowerCase().trim(),
	};
}

/**
 * Get product with full details (variants + media population)
 */
export async function getProductWithDetails(
	productId: string
): Promise<IProduct | null> {
	await dbConnect();

	const product = await Product.findById(productId)
		.populate('categories')
		.populate('media')
		.exec();

	return product;
}

/**
 * Search products with filters
 */
export async function searchProducts(
	query: string,
	filters?: {
		category?: string;
		tag?: string;
		status?: 'draft' | 'active' | 'archived';
		minPrice?: number;
		maxPrice?: number;
		skip?: number;
		limit?: number;
	}
): Promise<{ products: IProduct[]; total: number }> {
	await dbConnect();

	const skip = filters?.skip || 0;
	const limit = filters?.limit || 10;

	const searchQuery: any = {};

	// Full-text search
	if (query && query.trim().length > 0) {
		searchQuery.$text = { $search: query };
	}

	// Filters
	if (filters?.category) {
		searchQuery.categories = filters.category;
	}

	if (filters?.tag) {
		searchQuery.tags = filters.tag;
	}

	if (filters?.status) {
		searchQuery.status = filters.status;
	}

	if (filters?.minPrice || filters?.maxPrice) {
		searchQuery['variants.price'] = {};
		if (filters.minPrice) {
			searchQuery['variants.price'].$gte = filters.minPrice;
		}
		if (filters.maxPrice) {
			searchQuery['variants.price'].$lte = filters.maxPrice;
		}
	}

	const [products, total] = await Promise.all([
		Product.find(searchQuery)
			.skip(skip)
			.limit(limit)
			.sort({ createdAt: -1 }),
		Product.countDocuments(searchQuery),
	]);

	return { products, total };
}

/**
 * Add or update variant in product
 */
export async function addVariantToProduct(
	productId: string,
	variant: IVariant
): Promise<IProduct> {
	await dbConnect();

	// Validate SKU uniqueness
	const isUnique = await isSKUUnique(variant.sku, productId, true);
	if (!isUnique) {
		throw new AppError(
			`Variant SKU '${variant.sku}' already exists`,
			'SKU_EXISTS',
			409
		);
	}

	// Validate pricing
	validatePricing(variant.price, variant.comparePrice);

	const product = await Product.findById(productId);
	if (!product) {
		throw new AppError('Product not found', 'NOT_FOUND', 404);
	}

	// Add or update variant
	const existingVariantIdx = product.variants.findIndex(
		(v) => v._id?.toString() === variant._id?.toString()
	);

	if (existingVariantIdx >= 0) {
		// Update
		product.variants[existingVariantIdx] = variant;
	} else {
		// Add new
		product.variants.push(variant);
	}

	await product.save();
	return product;
}

/**
 * Remove variant from product
 */
export async function removeVariantFromProduct(
	productId: string,
	variantId: string
): Promise<IProduct> {
	await dbConnect();

	const product = await Product.findById(productId);
	if (!product) {
		throw new AppError('Product not found', 'NOT_FOUND', 404);
	}

	if (product.variants.length === 1) {
		throw new AppError(
			'Cannot delete the only variant. Product must have at least 1 variant',
			'LAST_VARIANT',
			422
		);
	}

	product.variants = product.variants.filter(
		(v) => v._id?.toString() !== variantId
	);
	await product.save();
	return product;
}
