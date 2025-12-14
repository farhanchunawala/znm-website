import { Types } from 'mongoose';
import { Collection, ICollection, IRule } from '@/models/CategoryModel';
import Product from '@/models/ProductModel';
import dbConnect from '@/lib/mongodb';
import slugify from 'slug';
import { AppError } from '@/lib/utils/errors';

/**
 * Generate unique collection handle/slug
 */
export async function generateCollectionHandle(
	title: string,
	collectionId?: string
): Promise<string> {
	await dbConnect();

	let handle = slugify(title, { lower: true, strict: true });
	let counter = 1;
	let finalHandle = handle;

	const query: any = { handle: finalHandle };
	if (collectionId) {
		query._id = { $ne: collectionId };
	}

	while (await Collection.findOne(query)) {
		finalHandle = `${handle}-${counter}`;
		query.handle = finalHandle;
		counter++;
	}

	return finalHandle;
}

/**
 * Rule engine: evaluate single rule against product
 */
function evaluateRule(product: any, rule: IRule): boolean {
	const fieldValue = getNestedValue(product, rule.field);

	switch (rule.operator) {
		case 'eq':
			return fieldValue === rule.value;

		case 'contains':
			if (Array.isArray(fieldValue)) {
				return fieldValue.includes(rule.value);
			}
			return String(fieldValue).includes(String(rule.value));

		case 'gt':
			return Number(fieldValue) > Number(rule.value);

		case 'lt':
			return Number(fieldValue) < Number(rule.value);

		case 'in':
			return Array.isArray(rule.value) && rule.value.includes(fieldValue);

		case 'between':
			const [min, max] = rule.value;
			return Number(fieldValue) >= min && Number(fieldValue) <= max;

		case 'dateRange':
			const date = new Date(fieldValue);
			const start = new Date(rule.value.start);
			const end = new Date(rule.value.end);
			return date >= start && date <= end;

		default:
			return false;
	}
}

/**
 * Helper to get nested object values (e.g., 'user.email')
 */
function getNestedValue(obj: any, path: string): any {
	return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Evaluate all rules (AND logic - all must pass)
 */
export function evaluateRules(product: any, rules: IRule[]): boolean {
	if (!rules || rules.length === 0) return true;
	return rules.every((rule) => evaluateRule(product, rule));
}

/**
 * Create collection
 */
export async function createCollection(data: {
	title: string;
	description?: string;
	type: 'manual' | 'dynamic';
	productIds?: string[];
	rules?: IRule[];
	startAt?: Date | string;
	endAt?: Date | string;
	priority?: number;
	status?: string;
	seo?: any;
	image?: string;
}): Promise<ICollection> {
	await dbConnect();

	const handle = await generateCollectionHandle(data.title);

	// Validate rules if dynamic
	if (data.type === 'dynamic' && data.rules?.length) {
		await validateRules(data.rules);
	}

	// Validate productIds if manual
	if (data.type === 'manual' && data.productIds?.length) {
		const count = await Product.countDocuments({
			_id: { $in: data.productIds },
		});
		if (count !== data.productIds.length) {
			throw new AppError(
				'Some product IDs are invalid',
				'INVALID_PRODUCTS',
				400
			);
		}
	}

	const collection = new Collection({
		...data,
		handle,
		productIds: data.productIds?.map((id) => new Types.ObjectId(id)) || [],
		startAt: data.startAt ? new Date(data.startAt) : undefined,
		endAt: data.endAt ? new Date(data.endAt) : undefined,
	});

	// Evaluate dynamic collection immediately
	if (data.type === 'dynamic') {
		await evaluateCollectionRules(collection);
	}

	await collection.save();
	return collection;
}

/**
 * Update collection
 */
export async function updateCollection(
	collectionId: string,
	data: Partial<{
		title: string;
		description?: string;
		type?: 'manual' | 'dynamic';
		productIds?: string[];
		rules?: IRule[];
		startAt?: Date | string;
		endAt?: Date | string;
		priority?: number;
		status?: string;
		seo?: any;
		image?: string;
	}>
): Promise<ICollection> {
	await dbConnect();

	const collection = await Collection.findById(collectionId);
	if (!collection) {
		throw new AppError('Collection not found', 'NOT_FOUND', 404);
	}

	// Update handle if title changed
	if (data.title && data.title !== collection.title) {
		collection.handle = await generateCollectionHandle(
			data.title,
			collectionId
		);
	}

	// Validate rules if provided
	if (data.rules) {
		await validateRules(data.rules);
	}

	// Update productIds if manual
	if (data.productIds && collection.type === 'manual') {
		const count = await Product.countDocuments({
			_id: { $in: data.productIds },
		});
		if (count !== data.productIds.length) {
			throw new AppError(
				'Some product IDs are invalid',
				'INVALID_PRODUCTS',
				400
			);
		}
		collection.productIds = data.productIds.map(
			(id) => new Types.ObjectId(id)
		);
	}

	Object.assign(collection, data);

	// Re-evaluate if rules changed
	if (data.rules) {
		await evaluateCollectionRules(collection);
	}

	await collection.save();
	return collection;
}

/**
 * Evaluate collection rules and cache results
 */
export async function evaluateCollectionRules(
	collection: ICollection
): Promise<void> {
	await dbConnect();

	if (collection.type !== 'dynamic' || !collection.rules?.length) {
		return;
	}

	// Find products matching all rules
	const products = await Product.find({ status: 'active' });

	const matchingProductIds = products
		.filter((product) => evaluateRules(product, collection.rules!))
		.map((p) => p._id);

	// Cache results
	collection.cachedProductIds = matchingProductIds;
	collection.cachedAt = new Date();

	await collection.save();
}

/**
 * Get active collection products (manual or cached dynamic)
 */
export async function getCollectionProducts(
	collectionId: string,
	skip = 0,
	limit = 50
): Promise<{ products: any[]; total: number }> {
	await dbConnect();

	const collection = await Collection.findById(collectionId);
	if (!collection) {
		throw new AppError('Collection not found', 'NOT_FOUND', 404);
	}

	// Determine which product IDs to use
	const productIds =
		collection.type === 'manual'
			? collection.productIds
			: collection.cachedProductIds;

	if (!productIds?.length) {
		return { products: [], total: 0 };
	}

	const [products, total] = await Promise.all([
		Product.find({ _id: { $in: productIds } })
			.skip(skip)
			.limit(limit),
		Product.countDocuments({ _id: { $in: productIds } }),
	]);

	return { products, total };
}

/**
 * Add products to manual collection
 */
export async function addProductsToCollection(
	collectionId: string,
	productIds: string[]
): Promise<ICollection> {
	await dbConnect();

	const collection = await Collection.findById(collectionId);
	if (!collection) {
		throw new AppError('Collection not found', 'NOT_FOUND', 404);
	}

	if (collection.type !== 'manual') {
		throw new AppError(
			'Cannot manually add products to dynamic collection',
			'INVALID_TYPE',
			422
		);
	}

	// Add new products
	const newIds = productIds.map((id) => new Types.ObjectId(id));
	collection.productIds = [
		...collection.productIds.filter(
			(id) => !newIds.some((ni) => ni.equals(id))
		),
		...newIds,
	];

	await collection.save();
	return collection;
}

/**
 * Remove product from manual collection
 */
export async function removeProductFromCollection(
	collectionId: string,
	productId: string
): Promise<ICollection> {
	await dbConnect();

	const collection = await Collection.findById(collectionId);
	if (!collection) {
		throw new AppError('Collection not found', 'NOT_FOUND', 404);
	}

	collection.productIds = collection.productIds.filter(
		(id) => id.toString() !== productId
	);
	await collection.save();
	return collection;
}

/**
 * Get active collections (scheduled + status active)
 */
export async function getActiveCollections(): Promise<ICollection[]> {
	await dbConnect();

	const now = new Date();

	return Collection.find({
		status: 'active',
		$or: [{ startAt: { $lte: now } }, { startAt: { $exists: false } }],
		$or: [{ endAt: { $gte: now } }, { endAt: { $exists: false } }],
	}).sort({ priority: -1 });
}

/**
 * Validate collection rules
 */
export async function validateRules(rules: IRule[]): Promise<void> {
	// List of supported fields in Product model
	const supportedFields = [
		'createdAt',
		'status',
		'tags',
		'categories',
		'variants.price',
		'seo.keywords',
	];

	for (const rule of rules) {
		// Check operator is valid
		const validOperators = [
			'eq',
			'contains',
			'gt',
			'lt',
			'in',
			'between',
			'dateRange',
		];
		if (!validOperators.includes(rule.operator)) {
			throw new AppError(
				`Invalid operator: ${rule.operator}`,
				'INVALID_OPERATOR',
				400
			);
		}

		// Basic field validation (could be extended)
		if (!rule.field) {
			throw new AppError('Rule field is required', 'MISSING_FIELD', 400);
		}

		// Validate value based on operator
		if (
			(rule.operator === 'between' || rule.operator === 'dateRange') &&
			!Array.isArray(rule.value)
		) {
			throw new AppError(
				`${rule.operator} requires array value`,
				'INVALID_VALUE',
				400
			);
		}
	}
}

/**
 * Soft delete collection
 */
export async function deleteCollection(
	collectionId: string
): Promise<ICollection> {
	await dbConnect();

	const collection = await Collection.findByIdAndUpdate(
		collectionId,
		{ status: 'hidden' },
		{ new: true }
	);

	if (!collection) {
		throw new AppError('Collection not found', 'NOT_FOUND', 404);
	}

	return collection;
}

/**
 * Search collections
 */
export async function searchCollections(
	query?: string,
	filters?: {
		type?: 'manual' | 'dynamic';
		status?: 'active' | 'hidden';
		skip?: number;
		limit?: number;
	}
): Promise<{ collections: ICollection[]; total: number }> {
	await dbConnect();

	const skip = filters?.skip || 0;
	const limit = filters?.limit || 10;

	const searchQuery: any = {};

	if (query) {
		searchQuery.$or = [
			{ title: { $regex: query, $options: 'i' } },
			{ handle: { $regex: query, $options: 'i' } },
		];
	}

	if (filters?.type) {
		searchQuery.type = filters.type;
	}

	if (filters?.status !== undefined) {
		searchQuery.status = filters.status;
	}

	const [collections, total] = await Promise.all([
		Collection.find(searchQuery)
			.skip(skip)
			.limit(limit)
			.sort({ priority: -1, createdAt: -1 }),
		Collection.countDocuments(searchQuery),
	]);

	return { collections, total };
}
