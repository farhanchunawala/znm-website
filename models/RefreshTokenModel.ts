import mongoose from 'mongoose';

const RefreshTokenSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		token: {
			type: String,
			required: true,
			unique: true,
		},
		expiresAt: {
			type: Date,
			required: true,
		},
		revoked: {
			type: Boolean,
			default: false,
		},
		deviceInfo: {
			userAgent: String,
			ip: String,
		},
	},
	{ timestamps: true }
);

// Index for automatic cleanup of expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ userId: 1 });

const RefreshToken =
	mongoose.models.RefreshToken ||
	mongoose.model('RefreshToken', RefreshTokenSchema, 'refresh_tokens');

export default RefreshToken;
