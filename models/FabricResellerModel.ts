import mongoose, { Schema } from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const FabricResellerSchema = new mongoose.Schema(
	{
		fabricResellerId: { type: Number, unique: true },
		name: {
			firstName: String,
			middleName: String,
			lastName: String,
		},
	},
	{ timestamps: true }
);

FabricResellerSchema.plugin(AutoIncrement(mongoose), { inc_field: 'fabricResellerId' });

// const FabricReseller = mongoose.models.FabricReseller || mongoose.model('FabricReseller', FabricResellerSchema);
const FabricReseller = mongoose.models.FabricReseller || mongoose.model('FabricReseller', FabricResellerSchema, 'fabricResellers');
// const FabricReseller = mongoose.model('FabricReseller', FabricResellerSchema, 'fabricResellers');

export default FabricReseller;
