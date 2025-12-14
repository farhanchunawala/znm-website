import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { computeMergePreview, executeMerge } from '@/lib/utils/customer-merge';
import { logAudit } from '@/lib/utils/audit';

/**
 * POST /api/customers/merge - Merge customers
 * Requires: customers.delete (admin-only)
 * Body: { targetCustomerId, sourceCustomerIds, dryRun? }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
	const { error: authError, user } = await authenticateRequest(request);
	if (authError) return authError;

	const { authorized, error: permError } = await requirePermission(
		'customers.delete'
	)(request, user);
	if (!authorized) return permError;

	await dbConnect();

	const {
		targetCustomerId,
		sourceCustomerIds,
		dryRun = false,
	} = await request.json();

	if (
		!targetCustomerId ||
		!Array.isArray(sourceCustomerIds) ||
		sourceCustomerIds.length === 0
	) {
		return ErrorResponses.badRequest('Invalid merge parameters');
	}

	const [target, sources] = await Promise.all([
		Customer.findById(targetCustomerId),
		Customer.find({
			_id: { $in: sourceCustomerIds },
			status: { $ne: 'merged' },
		}),
	]);

	if (!target) return ErrorResponses.notFound('Target customer not found');
	if (sources.length !== sourceCustomerIds.length) {
		return ErrorResponses.badRequest(
			'Some source customers not found or already merged'
		);
	}

	// Compute merge preview
	const preview = await computeMergePreview(target, sources);

	if (dryRun) {
		return successResponse({ preview, dryRun: true });
	}

	// Execute merge
	const mergeResult = await executeMerge(
		target,
		sources,
		preview,
		user.userId
	);

	await logAudit(user.userId, 'customer.merge', 'Customer', target._id, {
		sourceIds: sourceCustomerIds,
		conflicts: preview.conflicts,
	});

	return successResponse({ mergeResult });
});
