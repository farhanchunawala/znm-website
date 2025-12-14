// scripts/migrateUsers.ts - Migrate existing users to RBAC
import mongoose from 'mongoose';
import User from '../models/UserModel';

async function migrateUsers() {
	try {
		const mongoUri =
			process.env.MONGODB_URI || 'mongodb://localhost:27017/kkms';
		await mongoose.connect(mongoUri);
		console.log('✅ Connected to MongoDB');

		// Strategy 1: Add roles array to users without it
		console.log('\n📊 Checking users without roles field...');
		const usersWithoutRoles = await User.countDocuments({
			roles: { $exists: false },
		});

		if (usersWithoutRoles > 0) {
			const result1 = await User.updateMany(
				{ roles: { $exists: false } },
				{
					$set: {
						roles: ['customer'],
						status: 'active',
					},
				}
			);
			console.log(`✅ Added roles to ${result1.modifiedCount} users`);
		} else {
			console.log('ℹ️  All users already have roles field');
		}

		// Strategy 2: Migrate old singular 'role' field to 'roles' array
		console.log('\n📊 Checking users with old singular role field...');
		const usersWithOldRole = await User.countDocuments({
			role: { $exists: true },
		});

		if (usersWithOldRole > 0) {
			// Convert singular role to array
			const usersToMigrate = await User.find({ role: { $exists: true } });

			let migrated = 0;
			for (const user of usersToMigrate) {
				const oldRole = (user as any).role;
				if (!user.roles || user.roles.length === 0) {
					user.roles = [oldRole];
					await user.save();
					migrated++;
				}
			}

			console.log(
				`✅ Migrated ${migrated} users from singular role to roles array`
			);

			// Remove old role field
			await User.updateMany(
				{ role: { $exists: true } },
				{ $unset: { role: 1 } }
			);
			console.log('✅ Removed old role field');
		} else {
			console.log('ℹ️  No users with old role field found');
		}

		// Strategy 3: Ensure all users have status field
		console.log('\n📊 Checking users without status...');
		const usersWithoutStatus = await User.countDocuments({
			status: { $exists: false },
		});

		if (usersWithoutStatus > 0) {
			const result2 = await User.updateMany(
				{ status: { $exists: false } },
				{ $set: { status: 'active' } }
			);
			console.log(`✅ Added status to ${result2.modifiedCount} users`);
		} else {
			console.log('ℹ️  All users have status field');
		}

		// Summary
		console.log('\n📊 Migration Summary:');
		const totalUsers = await User.countDocuments();
		const adminCount = await User.countDocuments({ roles: 'admin' });
		const managerCount = await User.countDocuments({ roles: 'manager' });
		const workerCount = await User.countDocuments({ roles: 'worker' });
		const customerCount = await User.countDocuments({ roles: 'customer' });

		console.log(`   Total users: ${totalUsers}`);
		console.log(`   Admins: ${adminCount}`);
		console.log(`   Managers: ${managerCount}`);
		console.log(`   Workers: ${workerCount}`);
		console.log(`   Customers: ${customerCount}`);

		console.log('\n🎉 Migration completed successfully!');
		await mongoose.disconnect();
		process.exit(0);
	} catch (error) {
		console.error('❌ Migration failed:', error);
		await mongoose.disconnect();
		process.exit(1);
	}
}

// Run if executed directly
if (require.main === module) {
	migrateUsers();
}

export default migrateUsers;
