// scripts/seedRoles.ts - Seed roles and create default admin
import mongoose from 'mongoose';
import Role from '../models/RoleModel';
import User from '../models/UserModel';
import { hashPassword } from '../lib/utils/password';
import { ROLE_PERMISSIONS } from '../lib/permissions';

async function seedRoles() {
	try {
		// Connect to MongoDB
		const mongoUri =
			process.env.MONGODB_URI || 'mongodb://localhost:27017/kkms';
		await mongoose.connect(mongoUri);
		console.log('✅ Connected to MongoDB');

		// Define system roles
		const roles = [
			{
				name: 'admin',
				displayName: 'Administrator',
				description: 'Full system access with all permissions',
				permissions: ROLE_PERMISSIONS.admin,
				isSystemRole: true,
				level: 100,
			},
			{
				name: 'manager',
				displayName: 'Manager',
				description: 'Manages workers and operations',
				permissions: ROLE_PERMISSIONS.manager,
				isSystemRole: true,
				level: 50,
			},
			{
				name: 'worker',
				displayName: 'Worker',
				description:
					'Standard employee access for day-to-day operations',
				permissions: ROLE_PERMISSIONS.worker,
				isSystemRole: true,
				level: 10,
			},
			{
				name: 'customer',
				displayName: 'Customer',
				description: 'Customer account with order access',
				permissions: ROLE_PERMISSIONS.customer,
				isSystemRole: true,
				level: 0,
			},
		];

		// Upsert roles
		let rolesCreated = 0;
		for (const role of roles) {
			const result = await Role.findOneAndUpdate(
				{ name: role.name },
				role,
				{ upsert: true, new: true }
			);
			console.log(`✅ Role: ${role.displayName} (${role.name})`);
			rolesCreated++;
		}

		console.log(`\n✅ ${rolesCreated} roles seeded\n`);

		// Create default admin user if doesn't exist
		const adminEmail = process.env.ADMIN_EMAIL || 'admin@zollandmeter.com';
		const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123!'; // CHANGE IN PRODUCTION

		const adminExists = await User.findOne({ email: adminEmail });

		if (!adminExists) {
			const adminUser = await User.create({
				email: adminEmail,
				passwordHash: await hashPassword(adminPassword),
				name: {
					firstName: 'System',
					lastName: 'Admin',
				},
				roles: ['admin'],
				emailVerified: true,
				status: 'active',
			});

			console.log('✅ Default admin user created');
			console.log(`   Email: ${adminEmail}`);
			console.log(`   Password: ${adminPassword}`);
			console.log(
				'\n⚠️  IMPORTANT: Change the admin password in production!\n'
			);
		} else {
			console.log('ℹ️  Admin user already exists, skipping creation');
		}

		console.log('\n🎉 Seeding completed successfully!');
		await mongoose.disconnect();
		process.exit(0);
	} catch (error) {
		console.error('❌ Seeding failed:', error);
		await mongoose.disconnect();
		process.exit(1);
	}
}

// Run if executed directly
if (require.main === module) {
	seedRoles();
}

export default seedRoles;
