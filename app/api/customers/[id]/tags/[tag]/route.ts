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
 * DELETE /api/customers/:id/tags/:tag - Remove tag
 */
export const DELETE = withErrorHandler(
	async (
		request: NextRequest,
		{ params }: { params: { id: string; tag: string } }
	) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		const { authorized, error: permError } = await requirePermission(
			'customers.write'
		)(request, user);
		if (!authorized) return permError;

		await dbConnect();

		const customer = await Customer.findById(params.id);
		if (!customer) return ErrorResponses.notFound('Customer not found');

		const tag = canonicalizeTag(params.tag);
		customer.tags = customer.tags.filter((t) => t !== tag);
		await customer.save();

		await logAudit(
			user.userId,
			'customer.tags.remove',
			'Customer',
			customer._id,
			{ tag }
		);
		return successResponse({ tags: customer.tags });
	}
);
