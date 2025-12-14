import { z } from 'zod';

// ============= CATEGORY VALIDATION =============

export const CategoryCreateSchema = z.object({
	name: z.string().min(1).max(120),
	description: z.string().max(500).optional(),
	parentId: z.string().optional(), // MongoDB ObjectId string
	metadata: z.record(z.any()).optional().default({}),
	status: z.enum(['active', 'hidden']).default('active'),
	image: z.string().url().optional(),
	seo: z
		.object({
			title: z.string().max(60).optional(),
			description: z.string().max(160).optional(),
			keywords: z.array(z.string()).optional(),
		})
		.optional(),
});

export const CategoryUpdateSchema = CategoryCreateSchema.partial();

export const CategoryReorderSchema = z.array(
	z.object({
		id: z.string(),
		position: z.number().int().nonnegative(),
	})
);

// ============= COLLECTION VALIDATION =============

export const RuleSchema = z.object({
	field: z.string().min(1),
	operator: z.enum([
		'eq',
		'contains',
		'gt',
		'lt',
		'in',
		'between',
		'dateRange',
	]),
	value: z.any(),
});

export const CollectionCreateSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	type: z.enum(['manual', 'dynamic']),
	productIds: z.array(z.string()).optional().default([]),
	rules: z.array(RuleSchema).optional(),
	startAt: z.string().datetime().optional(),
	endAt: z.string().datetime().optional(),
	priority: z.number().int().default(0),
	status: z.enum(['active', 'hidden']).default('active'),
	seo: z
		.object({
			title: z.string().max(60).optional(),
			description: z.string().max(160).optional(),
			keywords: z.array(z.string()).optional(),
		})
		.optional(),
	image: z.string().url().optional(),
});

export const CollectionUpdateSchema = CollectionCreateSchema.partial();

export const CollectionAddProductSchema = z.object({
	productIds: z.array(z.string()).min(1),
});

// Type exports
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;
export type CategoryReorder = z.infer<typeof CategoryReorderSchema>;
export type CollectionCreate = z.infer<typeof CollectionCreateSchema>;
export type CollectionUpdate = z.infer<typeof CollectionUpdateSchema>;
export type CollectionAddProduct = z.infer<typeof CollectionAddProductSchema>;
export type Rule = z.infer<typeof RuleSchema>;
