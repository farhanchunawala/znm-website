import mongoose, { Schema } from 'mongoose';

const FabricSchema = new mongoose.Schema(
	{
		brand: String,
	},
	{ timestamps: true }
);

// const Fabric = mongoose.models.Fabric || mongoose.model('Fabric', FabricSchema);
const Fabric =
	mongoose.models.Fabric || mongoose.model('Fabric', FabricSchema, 'fabric');
// const Fabric = mongoose.model('Fabric', FabricSchema, 'fabric');

export default Fabric;
