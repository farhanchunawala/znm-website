import mongoose from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const UserSchema = new mongoose.Schema(
	{
		userId: { type: Number, unique: true },
		name: {
			firstName: String,
			middleName: String,
			lastName: String,
		},
		email: { type: String, required: true, unique: true, lowercase: true },
		phone: { type: String, unique: true, sparse: true },
		passwordHash: { type: String, required: true },
		roles: {
			type: [String],
			enum: ['customer', 'admin', 'manager', 'worker', 'vendor'],
			default: ['customer'],
		},
		emailVerified: { type: Boolean, default: false },
		status: {
			type: String,
			enum: ['active', 'suspended', 'deleted'],
			default: 'active',
		},
		lastLogin: { type: Date },
		passwordChangedAt: { type: Date }, // For invalidating sessions
		birthdate: { type: Date },
		birthdateLastChanged: { type: Date },
		referralCode: { type: String, unique: true },
		customerId: { type: String }, // Links to Customer model (e.g., "ZNM-0786")
		offers: [
			{
				code: String,
				type: String, // 'birthday', 'referral', 'personalized'
				description: String,
				expiresAt: Date,
				claimed: { type: Boolean, default: false },
			},
		],
	},
	{ timestamps: true }
);

UserSchema.plugin(AutoIncrement(mongoose), { inc_field: 'userId' });

const User =
	mongoose.models.User || mongoose.model('User', UserSchema, 'users');

export default User;
