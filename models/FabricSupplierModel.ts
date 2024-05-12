import mongoose, { Schema } from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const FabricSupplierSchema = new mongoose.Schema(
	{
		fabricSupplierId: { type: Number, unique: true },
		name: {
			firstName: String,
			middleName: String,
			lastName: String,
		},
	},
	{ timestamps: true }
);

FabricSupplierSchema.plugin(AutoIncrement(mongoose), { inc_field: 'fabricSupplierId' });

// const FabricSupplier = mongoose.models.FabricSupplier || mongoose.model('FabricSupplier', FabricSupplierSchema);
const FabricSupplier = mongoose.models.FabricSupplier || mongoose.model('FabricSupplier', FabricSupplierSchema, 'fabricSuppliers');
// const FabricSupplier = mongoose.model('FabricSupplier', FabricSupplierSchema, 'fabricSuppliers');

export default FabricSupplier;
