import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
		},
		displayName: {
			type: String,
			required: true,
		},
		description: String,
		permissions: [{ type: String }], // e.g., ['users.read', 'orders.manage']
		isSystemRole: {
			type: Boolean,
			default: false,
		}, // Cannot be deleted
		inheritsFrom: [{ type: String }], // Role inheritance
		level: {
			type: Number,
			default: 0,
		}, // Hierarchy: admin=100, manager=50, worker=10
	},
	{ timestamps: true }
);

// Indexes
RoleSchema.index({ name: 1 }, { unique: true });
RoleSchema.index({ level: -1 });

const Role =
	mongoose.models.Role || mongoose.model('Role', RoleSchema, 'roles');

export default Role;
