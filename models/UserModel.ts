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
	},
	{ timestamps: true }
);

UserSchema.plugin(AutoIncrement(mongoose), { inc_field: 'userId' });

// const User = mongoose.models.User || mongoose.model('User', UserSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');
// const User = mongoose.model('User', UserSchema, 'users');

export default User;
