// lib/permissions.ts - Centralized permissions registry

export const PERMISSIONS = {
	// Users
	'users.read': 'View user profiles',
	'users.create': 'Create new users',
	'users.update': 'Update user details',
	'users.delete': 'Delete users',
	'users.manage_roles': 'Assign/remove roles',

	// Orders
	'orders.read': 'View orders',
	'orders.create': 'Create orders',
	'orders.update': 'Update order status',
	'orders.delete': 'Cancel orders',
	'orders.refund': 'Process refunds',

	// Products
	'products.read': 'View products',
	'products.create': 'Add products',
	'products.update': 'Edit products',
	'products.delete': 'Remove products',
	'inventory.manage': 'Manage inventory',

	// Customers
	'customers.read': 'View customer profiles',
	'customers.write': 'Create/update customers',
	'customers.delete': 'Delete/merge customers',

	// Reports
	'reports.sales': 'View sales reports',
	'reports.analytics': 'View analytics',

	// System
	'system.settings': 'Manage system settings',
	'system.roles': 'Manage roles & permissions',
	'system.audit': 'View audit logs',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
	admin: Object.keys(PERMISSIONS) as Permission[], // All permissions
	manager: [
		'users.read',
		'users.create',
		'users.update',
		'customers.read',
		'customers.write',
		'orders.read',
		'orders.update',
		'orders.refund',
		'products.read',
		'products.update',
		'inventory.manage',
		'reports.sales',
		'reports.analytics',
	],
	worker: [
		'orders.read',
		'orders.update',
		'products.read',
		'inventory.manage',
	],
	customer: ['orders.read'], // Own orders only
	vendor: [
		'products.read',
		'products.create',
		'products.update',
		'inventory.manage',
		'orders.read',
	],
};

/**
 * Get all permissions for given roles (including inherited)
 */
export function getPermissionsForRoles(roles: string[]): Set<Permission> {
	const permissions = new Set<Permission>();

	for (const role of roles) {
		const rolePerms = ROLE_PERMISSIONS[role];
		if (rolePerms) {
			rolePerms.forEach((p) => permissions.add(p));
		}
	}

	return permissions;
}

/**
 * Check if roles have a specific permission
 */
export function hasPermission(
	roles: string[],
	permission: Permission
): boolean {
	const permissions = getPermissionsForRoles(roles);
	return permissions.has(permission);
}
