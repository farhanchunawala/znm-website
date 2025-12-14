// app/api/roles/route.ts - List and create roles
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
 * GET /api/roles - List all roles
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
	const { error: authError, user } = await authenticateRequest(request);
	if (authError) return authError;

	const { authorized, error: permError } = await requirePermission(
		'system.roles'
	)(request, user);
	if (!authorized) return permError;

	await dbConnect();

	const roles = await Role.find().sort({ level: -1 }).lean();

	return successResponse({ roles });
});

/**
 * POST /api/roles - Create new role
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
	const { error: authError, user } = await authenticateRequest(request);
	if (authError) return authError;

	const { authorized, error: permError } = await requirePermission(
		'system.roles'
	)(request, user);
	if (!authorized) return permError;

	await dbConnect();

	const body = await request.json();
	const { name, displayName, description, permissions, inheritsFrom, level } =
		body;

	if (!name || !displayName) {
		return ErrorResponses.badRequest('Name and displayName are required');
	}

	// Check if role exists
	const existingRole = await Role.findOne({ name: name.toLowerCase() });
	if (existingRole) {
		return ErrorResponses.conflict('Role already exists');
	}

	const newRole = await Role.create({
		name: name.toLowerCase(),
		displayName,
		description,
		permissions: permissions || [],
		inheritsFrom: inheritsFrom || [],
		level: level || 0,
		isSystemRole: false,
	});

	// Clear permissions cache
	clearPermissionsCache();

	// Audit log
	await logAction(
		{
			actorId: user.userId,
			action: 'role.create',
			resource: 'Role',
			resourceId: newRole._id.toString(),
			changes: { after: newRole.toObject() },
		},
		request
	);

	return successResponse({ role: newRole }, 201);
});
