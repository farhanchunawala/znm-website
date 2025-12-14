import mongoose, { Schema, Document } from 'mongoose';

export interface IMergeAudit extends Document {
	actorId: mongoose.Types.ObjectId;
	targetCustomerId: mongoose.Types.ObjectId;
	sourceCustomerIds: mongoose.Types.ObjectId[];
	mergedData: Record<string, any>;
	conflicts: Array<{ field: string; values: any[]; chosen: any }>;
	reassignments: {
		orders: number;
		payments: number;
		refunds: number;
	};
	rollbackData: Record<string, any>;
	status: 'preview' | 'completed' | 'rolled_back';
	createdAt: Date;
}

const MergeAuditSchema = new Schema<IMergeAudit>({
	actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	targetCustomerId: {
		type: Schema.Types.ObjectId,
		ref: 'Customer',
		required: true,
	},
	sourceCustomerIds: [{ type: Schema.Types.ObjectId, ref: 'Customer' }],
	mergedData: Schema.Types.Mixed,
	conflicts: [
		{
			field: String,
			values: [Schema.Types.Mixed],
			chosen: Schema.Types.Mixed,
		},
	],
	reassignments: {
		orders: { type: Number, default: 0 },
		payments: { type: Number, default: 0 },
		refunds: { type: Number, default: 0 },
	},
	rollbackData: Schema.Types.Mixed,
	status: {
		type: String,
		enum: ['preview', 'completed', 'rolled_back'],
		default: 'completed',
	},
	createdAt: { type: Date, default: Date.now },
});

const MergeAudit =
	mongoose.models.MergeAudit ||
	mongoose.model<IMergeAudit>('MergeAudit', MergeAuditSchema);

export default MergeAudit;
