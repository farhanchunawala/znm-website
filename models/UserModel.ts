import mongoose, { Schema } from 'mongoose';
import AutoIncrement from 'mongoose-sequence';

const UserSchema = new mongoose.Schema(
	{
		id: {
			type: Number,
			unique: true,
		},
		name: {},
	},
	{ timestamps: true }
);

UserSchema.plugin(AutoIncrement(mongoose), { inc_field: 'id' });

// const User = mongoose.models.User || mongoose.model('User', UserSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');
// const User = mongoose.model('User', UserSchema, 'users');

export default User;
