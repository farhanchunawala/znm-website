import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
	{
		actorId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		action: {
			type: String,
			required: true,
		}, // e.g., 'user.role.update'
		resource: {
			type: String,
			required: true,
		}, // e.g., 'User'
		resourceId: {
			type: mongoose.Schema.Types.ObjectId,
		},
		changes: mongoose.Schema.Types.Mixed, // { before: {...}, after: {...} }
		metadata: {
			ip: String,
			userAgent: String,
			method: String,
			endpoint: String,
		},
		status: {
			type: String,
			enum: ['success', 'failure'],
			default: 'success',
		},
		errorMessage: String,
	},
	{ timestamps: true }
);

// Indexes
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resourceId: 1 });
AuditLogSchema.index({ createdAt: -1 }); // For cleanup/queries

const AuditLog =
	mongoose.models.AuditLog ||
	mongoose.model('AuditLog', AuditLogSchema, 'audit_logs');

export default AuditLog;
