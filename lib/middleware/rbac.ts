// lib/middleware/rbac.ts - Role-Based Access Control Middleware
import { NextRequest } from 'next/server';
import Role from '@/models/RoleModel';
import { ErrorResponses } from '@/lib/utils/response';
import { Permission, ROLE_PERMISSIONS } from '@/lib/permissions';

// In-memory cache for permissions
const permissionsCache = new Map<
	string,
	{ permissions: Set<string>; expiresAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all permissions for a user's roles (with caching)
 */
export async function getUserPermissions(
	userId: string,
	roles: string[]
): Promise<Set<string>> {
	const cacheKey = `${userId}:${roles.sort().join(',')}`;
	const cached = permissionsCache.get(cacheKey);

	if (cached && cached.expiresAt > Date.now()) {
		return cached.permissions;
	}

	const permissions = new Set<string>();

	// First, add static permissions from ROLE_PERMISSIONS
	for (const role of roles) {
		const rolePerms = ROLE_PERMISSIONS[role];
		if (rolePerms) {
			rolePerms.forEach((p) => permissions.add(p));
		}
	}

	// Then, fetch dynamic permissions from database (for custom roles)
	try {
		const roleDocuments = await Role.find({ name: { $in: roles } });

		for (const role of roleDocuments) {
			// Add direct permissions
			role.permissions.forEach((p: string) => permissions.add(p));

			// Add inherited permissions
			if (role.inheritsFrom?.length) {
				const inheritedRoles = await Role.find({
					name: { $in: role.inheritsFrom },
				});
				inheritedRoles.forEach((r) =>
					r.permissions.forEach((p: string) => permissions.add(p))
				);
			}
		}
	} catch (error) {
		console.error('Error fetching role permissions:', error);
	}

	// Cache result
	permissionsCache.set(cacheKey, {
		permissions,
		expiresAt: Date.now() + CACHE_TTL,
	});

	return permissions;
}

/**
 * Middleware: Require specific permission(s)
 * User must have at least ONE of the required permissions
 */
export function requirePermission(permission: Permission | Permission[]) {
	return async (request: NextRequest, user: any) => {
		const requiredPermissions = Array.isArray(permission)
			? permission
			: [permission];

		// Admin bypass (has all permissions)
		if (user.roles.includes('admin')) {
			return { authorized: true, error: null };
		}

		const userPermissions = await getUserPermissions(
			user.userId,
			user.roles
		);

		const hasPermission = requiredPermissions.some((p) =>
			userPermissions.has(p)
		);

		if (!hasPermission) {
			return {
				authorized: false,
				error: ErrorResponses.forbidden(
					`Missing required permission: ${requiredPermissions.join(' or ')}`
				),
			};
		}

		return { authorized: true, error: null };
	};
}

/**
 * Middleware: Require specific role(s)
 * User must have at least ONE of the required roles
 */
export function requireRole(roles: string | string[]) {
	return async (request: NextRequest, user: any) => {
		const requiredRoles = Array.isArray(roles) ? roles : [roles];
		const hasRole = user.roles.some((r: string) =>
			requiredRoles.includes(r)
		);

		if (!hasRole) {
			return {
				authorized: false,
				error: ErrorResponses.forbidden(
					`Requires role: ${requiredRoles.join(' or ')}`
				),
			};
		}

		return { authorized: true, error: null };
	};
}

/**
 * Clear permissions cache (call on role update)
 */
export function clearPermissionsCache(userId?: string) {
	if (userId) {
		// Clear specific user's cache
		for (const key of permissionsCache.keys()) {
			if (key.startsWith(userId)) {
				permissionsCache.delete(key);
			}
		}
	} else {
		// Clear all cache
		permissionsCache.clear();
	}
}

/**
 * Check if user has permission (without middleware)
 */
export async function userHasPermission(
	userId: string,
	roles: string[],
	permission: Permission
): Promise<boolean> {
	if (roles.includes('admin')) return true;

	const userPermissions = await getUserPermissions(userId, roles);
	return userPermissions.has(permission);
}
