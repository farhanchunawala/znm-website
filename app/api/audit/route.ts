// app/api/audit/route.ts - List audit logs
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AuditLog from '@/models/AuditLogModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse } from '@/lib/utils/response';

/**
 * GET /api/audit - List audit logs with pagination and filters
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
	const { error: authError, user } = await authenticateRequest(request);
	if (authError) return authError;

	const { authorized, error: permError } = await requirePermission(
		'system.audit'
	)(request, user);
	if (!authorized) return permError;

	await dbConnect();

	// Parse query parameters
	const { searchParams } = new URL(request.url);
	const page = parseInt(searchParams.get('page') || '1');
	const limit = parseInt(searchParams.get('limit') || '50');
	const actorId = searchParams.get('actorId');
	const action = searchParams.get('action');
	const resource = searchParams.get('resource');
	const startDate = searchParams.get('startDate');
	const endDate = searchParams.get('endDate');

	// Build filter
	const filter: any = {};

	if (actorId) filter.actorId = actorId;
	if (action) filter.action = { $regex: action, $options: 'i' };
	if (resource) filter.resource = resource;

	if (startDate || endDate) {
		filter.createdAt = {};
		if (startDate) filter.createdAt.$gte = new Date(startDate);
		if (endDate) filter.createdAt.$lte = new Date(endDate);
	}

	// Execute query
	const [logs, total] = await Promise.all([
		AuditLog.find(filter)
			.populate('actorId', 'name email')
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		AuditLog.countDocuments(filter),
	]);

	return successResponse({
		logs,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
});
