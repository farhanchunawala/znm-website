import mongoose, { Schema } from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const FabricSchema = new mongoose.Schema(
	{
		fabricId: {
			type: Number,
			unique: true,
		},
		name: {
			brand: String,
			collection: String,
			product: String,
		},
		details: {
			width: Number,
		},
		composition: [
			{
				material: String,
				amount: Number,
			},
		],
		price: {
			cost: Number,
			firstPrice: Number,
		},
		colors: [
			{
				colorId: Number,
				color: String,
				quantity: [
					{
						length: Number,
						location: String,
					},
				],
				supplier: String,
			},
		],
	},
	{ timestamps: true }
);

FabricSchema.plugin(AutoIncrement(mongoose), { inc_field: 'fabricId' });

// const Fabric = mongoose.models.Fabric || mongoose.model('Fabric', FabricSchema);
const Fabric = mongoose.models.Fabric || mongoose.model('Fabric', FabricSchema, 'fabrics');
// const Fabric = mongoose.model('Fabric', FabricSchema, 'fabrics');

export default Fabric;
