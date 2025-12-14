// app/api/roles/[name]/route.ts - Get and update specific role
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Role from '@/models/RoleModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { logAction } from '@/lib/utils/audit';
import { clearPermissionsCache } from '@/lib/middleware/rbac';

/**
 * GET /api/roles/[name] - Get role by name
 */
export const GET = withErrorHandler(
	async (request: NextRequest, { params }: { params: { name: string } }) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		const { authorized, error: permError } = await requirePermission(
			'system.roles'
		)(request, user);
		if (!authorized) return permError;

		await dbConnect();

		const role = await Role.findOne({ name: params.name.toLowerCase() });

		if (!role) {
			return ErrorResponses.notFound('Role not found');
		}

		return successResponse({ role });
	}
);

/**
 * PATCH /api/roles/[name] - Update role
 */
export const PATCH = withErrorHandler(
	async (request: NextRequest, { params }: { params: { name: string } }) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		const { authorized, error: permError } = await requirePermission(
			'system.roles'
		)(request, user);
		if (!authorized) return permError;

		await dbConnect();

		const role = await Role.findOne({ name: params.name.toLowerCase() });

		if (!role) {
			return ErrorResponses.notFound('Role not found');
		}

		// Cannot modify system roles
		if (role.isSystemRole) {
			return ErrorResponses.forbidden('Cannot modify system roles');
		}

		const body = await request.json();
		const { displayName, description, permissions, inheritsFrom, level } =
			body;

		const before = role.toObject();

		if (displayName) role.displayName = displayName;
		if (description) role.description = description;
		if (permissions) role.permissions = permissions;
		if (inheritsFrom) role.inheritsFrom = inheritsFrom;
		if (level !== undefined) role.level = level;

		await role.save();

		// Clear permissions cache
		clearPermissionsCache();

		// Audit log
		await logAction(
			{
				actorId: user.userId,
				action: 'role.update',
				resource: 'Role',
				resourceId: role._id.toString(),
				changes: { before, after: role.toObject() },
			},
			request
		);

		return successResponse({ role });
	}
);
