import mongoose, { Schema, Document } from 'mongoose';

// ============= CATEGORY MODEL =============

interface ICategory extends Document {
	name: string;
	slug: string;
	description?: string;
	parentId?: Schema.Types.ObjectId;
	ancestors: Schema.Types.ObjectId[]; // Path from root to parent
	position: number; // For ordering siblings
	metadata?: Record<string, any>;
	status: 'active' | 'hidden';
	image?: string; // Category image URL
	seo?: {
		title?: string;
		description?: string;
		keywords?: string[];
	};
	productCount?: number; // Denormalized count
	createdAt: Date;
	updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
	{
		name: { type: String, required: true, trim: true, maxlength: 120 },
		slug: {
			type: String,
			unique: true,
			sparse: true,
			lowercase: true,
			required: true,
		},
		description: { type: String, trim: true },
		parentId: {
			type: Schema.Types.ObjectId,
			ref: 'Category',
			default: null,
		},
		ancestors: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
		position: { type: Number, default: 0 },
		metadata: { type: Schema.Types.Mixed, default: {} },
		status: { type: String, enum: ['active', 'hidden'], default: 'active' },
		image: String,
		seo: {
			title: String,
			description: String,
			keywords: [String],
		},
		productCount: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

// Indexes
CategorySchema.index({ slug: 1 }, { unique: true, sparse: true });
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ ancestors: 1 });
CategorySchema.index({ status: 1 });
CategorySchema.index({ name: 'text', description: 'text' });

const Category =
	mongoose.models.Category ||
	mongoose.model<ICategory>('Category', CategorySchema, 'categories');

// ============= COLLECTION MODEL =============

interface IRule {
	field: string; // e.g., 'createdAt', 'salesCount', 'tags'
	operator: 'eq' | 'contains' | 'gt' | 'lt' | 'in' | 'between' | 'dateRange';
	value: any; // e.g., 30, ['tag1', 'tag2'], {start: Date, end: Date}
}

interface ICollection extends Document {
	title: string;
	handle: string; // Slug
	description?: string;
	type: 'manual' | 'dynamic';
	productIds: Schema.Types.ObjectId[]; // Used for manual collections
	rules?: IRule[]; // Used for dynamic collections
	cachedProductIds?: Schema.Types.ObjectId[]; // Cached results for dynamic
	cachedAt?: Date; // When cache was last updated
	startAt?: Date; // Collection publish date
	endAt?: Date; // Collection expiry date
	priority: number; // Higher = shown first
	status: 'active' | 'hidden';
	seo?: {
		title?: string;
		description?: string;
		keywords?: string[];
	};
	image?: string;
	createdAt: Date;
	updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
	{
		title: { type: String, required: true, trim: true, maxlength: 200 },
		handle: {
			type: String,
			unique: true,
			sparse: true,
			lowercase: true,
			required: true,
		},
		description: String,
		type: {
			type: String,
			enum: ['manual', 'dynamic'],
			default: 'manual',
			required: true,
		},
		productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
		rules: [
			{
				field: String,
				operator: {
					type: String,
					enum: [
						'eq',
						'contains',
						'gt',
						'lt',
						'in',
						'between',
						'dateRange',
					],
				},
				value: Schema.Types.Mixed,
			},
		],
		cachedProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
		cachedAt: Date,
		startAt: Date,
		endAt: Date,
		priority: { type: Number, default: 0 },
		status: { type: String, enum: ['active', 'hidden'], default: 'active' },
		seo: {
			title: String,
			description: String,
			keywords: [String],
		},
		image: String,
	},
	{ timestamps: true }
);

// Indexes
CollectionSchema.index({ handle: 1 }, { unique: true, sparse: true });
CollectionSchema.index({ status: 1 });
CollectionSchema.index({ startAt: 1, endAt: 1 });
CollectionSchema.index({ priority: -1 });
CollectionSchema.index({ type: 1 });
CollectionSchema.index({ productIds: 1 });

const Collection =
	mongoose.models.Collection ||
	mongoose.model<ICollection>('Collection', CollectionSchema, 'collections');

export default Category;
export { Collection, Category };
export type { ICategory, ICollection, IRule };
