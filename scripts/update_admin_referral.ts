// scripts/update_admin_referral.ts - Set a referral code for the admin user to avoid duplicate key on null
import 'dotenv/config';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import mongoose from 'mongoose';

async function run() {
	await dbConnect();
	const adminEmail = process.env.ADMIN_EMAIL || 'admin@zollandmeter.com';
	const admin = await User.findOne({ email: adminEmail.toLowerCase() });
	if (!admin) {
		console.error('Admin user not found');
		process.exit(1);
	}
	// Set a unique referral code if not set
	if (!admin.referralCode) {
		admin.referralCode = `ADMIN-${new mongoose.Types.ObjectId().toHexString().slice(-6)}`;
		await admin.save();
		console.log('Admin referral code set to', admin.referralCode);
	} else {
		console.log('Admin already has referral code', admin.referralCode);
	}
	process.exit(0);
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
