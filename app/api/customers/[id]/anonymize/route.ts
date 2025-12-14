import { NextRequest } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { logAudit } from '@/lib/utils/audit';

/**
 * POST /api/customers/:id/anonymize - GDPR right-to-be-forgotten
 * Requires: customers.delete (admin-only)
 */
export const POST = withErrorHandler(
	async (request: NextRequest, { params }: { params: { id: string } }) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		const { authorized, error: permError } = await requirePermission(
			'customers.delete'
		)(request, user);
		if (!authorized) return permError;

		await dbConnect();

		const customer = await Customer.findById(params.id);
		if (!customer) return ErrorResponses.notFound('Customer not found');

		// Create anonymization hash
		const hash = crypto
			.createHash('sha256')
			.update(customer._id.toString())
			.digest('hex')
			.substring(0, 8);

		// Anonymize PII
		customer.email = `anonymized-${hash}@deleted.local`;
		customer.phone = undefined;
		customer.name = `Anonymized User ${hash}`;
		customer.dob = undefined;
		customer.addresses = [];
		customer.tags = ['anonymized'];
		customer.status = 'inactive';
		customer.meta = { anonymized: true, anonymizedAt: new Date() };

		await customer.save();

		await logAudit(
			user.userId,
			'customer.anonymize',
			'Customer',
			customer._id,
			{
				reason: 'GDPR right-to-be-forgotten',
			}
		);

		return successResponse({
			message: 'Customer anonymized',
			customerId: customer._id,
		});
	}
);
