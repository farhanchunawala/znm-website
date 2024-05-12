import mongoose, { Schema } from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const FabricRollSchema = new mongoose.Schema(
	{
		fabricRollId: { type: Number, unique: true },
		fabricId: { type: Number, ref: 'Fabric' },
		colorId: Number,
		color: String,
		supplier: String,
		price: {
			cost: Number,
			firstPrice: Number,
		},
		pieces: [
			{
				length: Number,
				location: String,
			},
		],
	},
	{ timestamps: true }
);

FabricRollSchema.plugin(AutoIncrement(mongoose), { inc_field: 'fabricRollId' });

// const FabricRoll = mongoose.models.FabricRoll || mongoose.model('FabricRoll', FabricRollSchema);
const FabricRoll = mongoose.models.FabricRoll || mongoose.model('FabricRoll', FabricRollSchema, 'fabricRolls');
// const FabricRoll = mongoose.model('FabricRoll', FabricRollSchema, 'fabricRolls');

export default FabricRoll;
