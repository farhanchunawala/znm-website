import mongoose, { Schema } from 'mongoose';

const UserSchema = new mongoose.Schema(
	{
		name: {},
	},
	{ timestamps: true }
);

// const User = mongoose.models.User || mongoose.model('User', UserSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema, 'user');
// const User = mongoose.model('User', UserSchema, 'user');

export default User;
