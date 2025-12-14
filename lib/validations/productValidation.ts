import { z } from 'zod';

// Option validation
export const OptionSchema = z.object({
	name: z.string().min(1).toLowerCase(),
	value: z.string().min(1).toLowerCase(),
});

// Variant validation
export const VariantSchema = z.object({
	sku: z.string().min(3).toUpperCase(),
	price: z.number().positive('Price must be greater than 0'),
	comparePrice: z.number().positive().optional(),
	options: z
		.array(OptionSchema)
		.min(1, 'Variant must have at least 1 option'),
	images: z.array(z.string().url()).optional().default([]),
	inventoryId: z.string().optional(),
	stock: z.number().int().nonnegative().optional(),
	isActive: z.boolean().optional().default(true),
});

// Variant update (partial)
export const VariantUpdateSchema = VariantSchema.partial();

// SEO validation
export const SEOSchema = z.object({
	title: z.string().max(60).optional(),
	description: z.string().max(160).optional(),
	keywords: z.array(z.string()).optional(),
});

// Product creation validation
export const ProductCreateSchema = z.object({
	title: z.string().min(3).max(200),
	description: z.string().min(10).max(5000).optional(),
	sku: z.string().min(3).toUpperCase(),
	categories: z.array(z.string()).optional().default([]),
	tags: z.array(z.string().toLowerCase()).optional().default([]),
	variants: z
		.array(VariantSchema)
		.min(1, 'Product must have at least 1 variant'),
	media: z.array(z.string()).optional().default([]),
	status: z.enum(['draft', 'active', 'archived']).default('draft'),
	seo: SEOSchema.optional(),
});

// Product update validation (all fields optional except title validation if provided)
export const ProductUpdateSchema = z.object({
	title: z.string().min(3).max(200).optional(),
	description: z.string().min(10).max(5000).optional(),
	sku: z.string().min(3).toUpperCase().optional(),
	categories: z.array(z.string()).optional(),
	tags: z.array(z.string().toLowerCase()).optional(),
	status: z.enum(['draft', 'active', 'archived']).optional(),
	seo: SEOSchema.optional(),
});

// Product publish validation
export const ProductPublishSchema = z.object({
	status: z.enum(['active']),
});

// Image upload validation
export const ImageUploadSchema = z.object({
	variantId: z.string().optional(),
	alt: z.string().optional(),
});

// Batch variant creation
export const BatchVariantSchema = z.array(VariantSchema).min(1);

// Type exports
export type IOption = z.infer<typeof OptionSchema>;
export type IVariant = z.infer<typeof VariantSchema>;
export type IProductCreate = z.infer<typeof ProductCreateSchema>;
export type IProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type IProductPublish = z.infer<typeof ProductPublishSchema>;
export type ISEO = z.infer<typeof SEOSchema>;
