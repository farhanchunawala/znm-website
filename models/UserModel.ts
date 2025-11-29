import mongoose, { Schema } from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const UserSchema = new mongoose.Schema(
	{
		userId: { type: Number, unique: true },
		name: {
			firstName: String,
			middleName: String,
			lastName: String,
		},
		email: { type: String, required: true, unique: true },
		phone: { type: String, unique: true },
		passwordHash: { type: String, required: true },
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

const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');

export default User;
