// scripts/fix_user_indexes.ts - Drop and recreate unique indexes with sparse option for UserModel
import { config } from 'dotenv';
import path from 'path';

// Load .env.local explicitly
config({ path: path.join(__dirname, '..', '.env.local') });

import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';

async function run() {
	await dbConnect();
	const coll = User.collection;
	// Drop existing indexes if they exist
	try {
		await coll.dropIndex('referralCode_1');
		console.log('Dropped index referralCode_1');
	} catch (e) {
		console.log('referralCode_1 index not found or could not be dropped');
	}
	try {
		await coll.dropIndex('phone_1');
		console.log('Dropped index phone_1');
	} catch (e) {
		console.log('phone_1 index not found or could not be dropped');
	}
	// Recreate indexes with sparse:true
	await coll.createIndex({ referralCode: 1 }, { unique: true, sparse: true });
	console.log('Created sparse unique index on referralCode');
	await coll.createIndex({ phone: 1 }, { unique: true, sparse: true });
	console.log('Created sparse unique index on phone');
	process.exit(0);
}

run().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
