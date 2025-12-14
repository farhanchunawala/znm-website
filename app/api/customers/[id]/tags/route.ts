import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { canonicalizeTag } from '@/lib/utils/customer-validation';
import { logAudit } from '@/lib/utils/audit';

/**
 * POST /api/customers/:id/tags - Add tags (idempotent)
 */
export const POST = withErrorHandler(
	async (request: NextRequest, { params }: { params: { id: string } }) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		const { authorized, error: permError } = await requirePermission(
			'customers.write'
		)(request, user);
		if (!authorized) return permError;

		await dbConnect();

		const { tags } = await request.json();
		if (!Array.isArray(tags))
			return ErrorResponses.badRequest('Tags must be an array');

		const customer = await Customer.findById(params.id);
		if (!customer) return ErrorResponses.notFound('Customer not found');

		const canonicalTags = tags.map(canonicalizeTag);
		const newTags = canonicalTags.filter((t) => !customer.tags.includes(t));

		if (newTags.length > 0) {
			customer.tags.push(...newTags);
			await customer.save();
			await logAudit(
				user.userId,
				'customer.tags.add',
				'Customer',
				customer._id,
				{ tags: newTags }
			);
		}

		return successResponse({ tags: customer.tags });
	}
);
