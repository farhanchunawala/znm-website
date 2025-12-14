import mongoose, { Schema, Document } from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

// Option interface for variant options
interface IOption {
	name: string; // e.g., 'size', 'color'
	value: string; // e.g., 'M', 'red'
}

// Variant interface
interface IVariant {
	_id?: string;
	sku: string;
	price: number;
	comparePrice?: number;
	options: IOption[];
	images: string[]; // Image URLs or IDs
	inventoryId?: Schema.Types.ObjectId; // Link to inventory
	stock?: number; // Denormalized for quick access
	isActive: boolean;
}

// SEO interface
interface ISEO {
	title?: string;
	description?: string;
	keywords?: string[];
}

// Product interface
interface IProduct extends Document {
	productId: number;
	title: string;
	slug: string;
	description: string;
	sku: string; // Master SKU
	categories: Schema.Types.ObjectId[];
	tags: string[];
	variants: IVariant[];
	media: Schema.Types.ObjectId[]; // References to media collection
	status: 'draft' | 'active' | 'archived';
	seo: ISEO;
	createdAt: Date;
	updatedAt: Date;
}

// Variant sub-schema
const VariantSchema = new Schema<IVariant>(
	{
		sku: { type: String, required: true },
		price: { type: Number, required: true, min: 0 },
		comparePrice: { type: Number, min: 0 },
		options: [
			{
				name: { type: String, required: true, lowercase: true },
				value: { type: String, required: true, lowercase: true },
			},
		],
		images: [String],
		inventoryId: { type: Schema.Types.ObjectId, ref: 'Inventory' },
		stock: { type: Number, default: 0 },
		isActive: { type: Boolean, default: true },
	},
	{ _id: true }
);

// SEO sub-schema
const SEOSchema = new Schema<ISEO>(
	{
		title: String,
		description: String,
		keywords: [String],
	},
	{ _id: false }
);

// Product main schema
const ProductSchema = new Schema<IProduct>(
	{
		productId: { type: Number, unique: true },
		title: { type: String, required: true, trim: true },
		slug: { type: String, unique: true, sparse: true, lowercase: true },
		description: { type: String, trim: true },
		sku: { type: String, unique: true, sparse: true, uppercase: true },
		categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
		tags: [{ type: String, lowercase: true }],
		variants: [VariantSchema],
		media: [{ type: Schema.Types.ObjectId, ref: 'Media' }],
		status: {
			type: String,
			enum: ['draft', 'active', 'archived'],
			default: 'draft',
		},
		seo: SEOSchema,
	},
	{ timestamps: true }
);

// Indexes for performance
ProductSchema.index({ slug: 1 }, { unique: true, sparse: true });
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });
ProductSchema.index({ title: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ categories: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ 'variants.sku': 1 });
ProductSchema.index({ createdAt: -1 });

// Auto-increment plugin
ProductSchema.plugin(AutoIncrement(mongoose), { inc_field: 'productId' });

const Product =
	mongoose.models.Product ||
	mongoose.model<IProduct>('Product', ProductSchema, 'products');

export default Product;
export type { IProduct, IVariant, IOption, ISEO };
