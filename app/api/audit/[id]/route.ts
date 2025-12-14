// app/api/audit/[id]/route.ts - Get a single audit log entry
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AuditLog from '@/models/AuditLogModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';

/**
 * GET /api/audit/:id - Retrieve a single audit log entry
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
	// Authenticate
	const { error: authError, user } = await authenticateRequest(request);
	if (authError) return authError;

	// Authorize - requires system.audit permission
	const { authorized, error: permError } = await requirePermission(
		'system.audit'
	)(request, user);
	if (!authorized) return permError;

	await dbConnect();

	// Extract ID from URL
	const { searchParams } = new URL(request.url);
	// The ID is part of the pathname after /api/audit/
	const pathname = new URL(request.url).pathname;
	const parts = pathname.split('/');
	const auditId = parts[parts.length - 1];

	if (!auditId) {
		return ErrorResponses.badRequest('Audit ID is required');
	}

	const audit = await AuditLog.findById(auditId).lean();

	if (!audit) {
		return ErrorResponses.notFound('Audit entry not found');
	}

	return successResponse({ audit });
});
