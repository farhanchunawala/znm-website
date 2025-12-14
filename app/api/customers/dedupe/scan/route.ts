import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse } from '@/lib/utils/response';
import { findDuplicateCandidates } from '@/lib/utils/customer-merge';

/**
 * POST /api/customers/dedupe/scan - Scan for duplicates
 * Requires: customers.delete (admin-only)
 * Body: { confidenceThreshold?: number, limit?: number }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
	const { error: authError, user } = await authenticateRequest(request);
	if (authError) return authError;

	const { authorized, error: permError } = await requirePermission(
		'customers.delete'
	)(request, user);
	if (!authorized) return permError;

	await dbConnect();

	const { confidenceThreshold = 0.8, limit = 100 } = await request.json();

	const duplicateCandidates = await findDuplicateCandidates(
		confidenceThreshold,
		limit
	);

	return successResponse({
		candidates: duplicateCandidates,
		count: duplicateCandidates.length,
	});
});
