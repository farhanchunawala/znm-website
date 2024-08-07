import mongoose, { Schema } from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const ProductSchema = new mongoose.Schema(
	{
		productId: { type: Number, unique: true },
		title: String,
		mrp: String,
		sizes: [],
		description: String
	},
	{ timestamps: true }
);

ProductSchema.plugin(AutoIncrement(mongoose), { inc_field: 'productId' });

// const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema, 'products');
// const Product = mongoose.model('Product', ProductSchema, 'products');

export default Product;
