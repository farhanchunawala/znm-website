import { Types } from 'mongoose';
import Category, { ICategory } from '@/models/CategoryModel';
import dbConnect from '@/lib/mongodb';
import slugify from 'slug';
import { AppError } from '@/lib/utils/errors';

/**
 * Generate unique category slug
 */
export async function generateCategorySlug(
	name: string,
	categoryId?: string
): Promise<string> {
	await dbConnect();

	let slug = slugify(name, { lower: true, strict: true });
	let counter = 1;
	let finalSlug = slug;

	const query: any = { slug: finalSlug };
	if (categoryId) {
		query._id = { $ne: categoryId };
	}

	while (await Category.findOne(query)) {
		finalSlug = `${slug}-${counter}`;
		query.slug = finalSlug;
		counter++;
	}

	return finalSlug;
}

/**
 * Build ancestors array when creating/updating category
 */
export async function buildAncestors(
	parentId?: string
): Promise<Types.ObjectId[]> {
	if (!parentId) {
		return [];
	}

	await dbConnect();

	const parent = await Category.findById(parentId);
	if (!parent) {
		throw new AppError(
			'Parent category not found',
			'PARENT_NOT_FOUND',
			404
		);
	}

	// Ancestors = parent's ancestors + parent itself
	const ancestors = [...parent.ancestors, new Types.ObjectId(parentId)];
	return ancestors;
}

/**
 * Prevent cyclic parent assignment
 */
export async function validateParentAssignment(
	categoryId: string,
	newParentId?: string
): Promise<void> {
	if (!newParentId) return;

	await dbConnect();

	// Check if newParentId is a descendant of categoryId
	const potentialChild = await Category.findById(newParentId);
	if (!potentialChild) {
		throw new AppError(
			'Parent category not found',
			'PARENT_NOT_FOUND',
			404
		);
	}

	// If newParent's ancestors include categoryId, it's cyclic
	if (potentialChild.ancestors.some((id) => id.toString() === categoryId)) {
		throw new AppError(
			'Cannot assign category as parent of itself',
			'CYCLIC_PARENT',
			422
		);
	}
}

/**
 * Create category with ancestors
 */
export async function createCategory(data: {
	name: string;
	description?: string;
	parentId?: string;
	status?: string;
	metadata?: any;
	image?: string;
	seo?: any;
}): Promise<ICategory> {
	await dbConnect();

	if (data.parentId) {
		await validateParentAssignment(data.parentId, data.parentId);
	}

	const slug = await generateCategorySlug(data.name);
	const ancestors = await buildAncestors(data.parentId);

	const category = new Category({
		...data,
		slug,
		ancestors,
		parentId: data.parentId ? new Types.ObjectId(data.parentId) : undefined,
		position: 0,
	});

	await category.save();
	return category;
}

/**
 * Update category with ancestor recalculation if parent changes
 */
export async function updateCategory(
	categoryId: string,
	data: Partial<{
		name: string;
		description?: string;
		parentId?: string;
		status?: string;
		metadata?: any;
		image?: string;
		seo?: any;
	}>
): Promise<ICategory> {
	await dbConnect();

	const category = await Category.findById(categoryId);
	if (!category) {
		throw new AppError('Category not found', 'NOT_FOUND', 404);
	}

	// Validate parent if changing
	if (
		data.parentId !== undefined &&
		data.parentId !== category.parentId?.toString()
	) {
		await validateParentAssignment(categoryId, data.parentId);

		// Recalculate ancestors
		const ancestors = await buildAncestors(data.parentId);
		category.ancestors = ancestors;
		category.parentId = data.parentId
			? new Types.ObjectId(data.parentId)
			: undefined;
	}

	// Update slug if name changed
	if (data.name && data.name !== category.name) {
		category.slug = await generateCategorySlug(data.name, categoryId);
	}

	// Update other fields
	Object.assign(category, data);

	await category.save();
	return category;
}

/**
 * Get category tree (nested structure)
 */
export async function getCategoryTree(flat = false): Promise<any[]> {
	await dbConnect();

	const categories = await Category.find({ status: 'active' }).sort({
		position: 1,
	});

	if (flat) {
		return categories;
	}

	// Build tree structure
	const categoryMap = new Map<string, any>();
	const tree: any[] = [];

	// First pass: create all nodes
	categories.forEach((cat) => {
		categoryMap.set(cat._id.toString(), {
			_id: cat._id,
			name: cat.name,
			slug: cat.slug,
			description: cat.description,
			status: cat.status,
			position: cat.position,
			image: cat.image,
			productCount: cat.productCount || 0,
			children: [],
		});
	});

	// Second pass: build hierarchy
	categories.forEach((cat) => {
		const node = categoryMap.get(cat._id.toString());

		if (cat.parentId) {
			const parent = categoryMap.get(cat.parentId.toString());
			if (parent) {
				parent.children.push(node);
			}
		} else {
			tree.push(node);
		}
	});

	return tree;
}

/**
 * Get single category with breadcrumb
 */
export async function getCategoryWithBreadcrumb(categoryId: string): Promise<{
	category: ICategory;
	breadcrumb: Array<{ id: string; name: string; slug: string }>;
}> {
	await dbConnect();

	const category =
		await Category.findById(categoryId).populate('parentId ancestors');
	if (!category) {
		throw new AppError('Category not found', 'NOT_FOUND', 404);
	}

	// Build breadcrumb from ancestors + self
	const breadcrumb: any[] = [];
	for (const ancestorId of category.ancestors) {
		const ancestor = await Category.findById(ancestorId);
		if (ancestor) {
			breadcrumb.push({
				id: ancestor._id.toString(),
				name: ancestor.name,
				slug: ancestor.slug,
			});
		}
	}
	breadcrumb.push({
		id: category._id.toString(),
		name: category.name,
		slug: category.slug,
	});

	return { category, breadcrumb };
}

/**
 * Reorder categories (bulk position update)
 */
export async function reorderCategories(
	reorderData: Array<{ id: string; position: number }>
): Promise<void> {
	await dbConnect();

	const updates = reorderData.map((item) =>
		Category.findByIdAndUpdate(item.id, { position: item.position })
	);

	await Promise.all(updates);
}

/**
 * Check if category has products before deletion
 */
export async function canDeleteCategory(
	categoryId: string,
	force = false
): Promise<boolean> {
	await dbConnect();

	const Product = await import('@/models/ProductModel').then(
		(m) => m.default
	);

	// Check for products with this as primary category
	const productCount = await Product.countDocuments({
		$or: [
			{ primaryCategoryId: new Types.ObjectId(categoryId) },
			{ categories: new Types.ObjectId(categoryId) },
		],
	});

	if (productCount > 0 && !force) {
		throw new AppError(
			`Category has ${productCount} products. Use force=true to reassign.`,
			'HAS_PRODUCTS',
			409
		);
	}

	return true;
}

/**
 * Soft delete category
 */
export async function deleteCategory(
	categoryId: string,
	force = false
): Promise<ICategory> {
	await dbConnect();

	await canDeleteCategory(categoryId, force);

	const category = await Category.findByIdAndUpdate(
		categoryId,
		{ status: 'hidden' },
		{ new: true }
	);

	if (!category) {
		throw new AppError('Category not found', 'NOT_FOUND', 404);
	}

	// If force, reassign products to parent or root
	if (force && category.parentId) {
		const Product = await import('@/models/ProductModel').then(
			(m) => m.default
		);

		await Product.updateMany(
			{ primaryCategoryId: new Types.ObjectId(categoryId) },
			{ primaryCategoryId: category.parentId }
		);

		await Product.updateMany(
			{ categories: new Types.ObjectId(categoryId) },
			{ $pull: { categories: new Types.ObjectId(categoryId) } }
		);
	}

	return category;
}

/**
 * Update category product count (denormalized)
 */
export async function updateCategoryProductCount(
	categoryId: string
): Promise<void> {
	await dbConnect();

	const Product = await import('@/models/ProductModel').then(
		(m) => m.default
	);

	const count = await Product.countDocuments({
		$or: [
			{ primaryCategoryId: new Types.ObjectId(categoryId) },
			{ categories: new Types.ObjectId(categoryId) },
		],
	});

	await Category.findByIdAndUpdate(categoryId, { productCount: count });
}

/**
 * Get descendants of a category (for cascade operations)
 */
export async function getCategoryDescendants(
	categoryId: string
): Promise<ICategory[]> {
	await dbConnect();

	return Category.find({
		ancestors: new Types.ObjectId(categoryId),
	});
}
