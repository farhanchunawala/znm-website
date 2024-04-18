import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	surname: {
		type: String,
		required: true,
	},
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
// const User = mongoose.model('User', UserSchema, 'user');

export default User;
