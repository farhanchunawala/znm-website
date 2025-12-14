import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { normalizePhone } from '@/lib/utils/customer-validation';
import { logAudit } from '@/lib/utils/audit';

/**
 * PATCH /api/customers/:id/addresses/:addrId - Update address
 */
export const PATCH = withErrorHandler(
	async (
		request: NextRequest,
		{ params }: { params: { id: string; addrId: string } }
	) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		await dbConnect();

		const { authorized } = await requirePermission('customers.write')(
			request,
			user
		);

		const customer = await Customer.findById(params.id);
		if (!customer) return ErrorResponses.notFound('Customer not found');

		const isSelf =
			customer.userId && customer.userId.toString() === user.userId;
		if (!authorized && !isSelf) {
			return ErrorResponses.forbidden('Insufficient permissions');
		}

		const address = customer.addresses.find((a) => a.id === params.addrId);
		if (!address) return ErrorResponses.notFound('Address not found');

		const body = await request.json();
		Object.assign(address, body);
		if (body.phone) address.phone = normalizePhone(body.phone);

		if (body.isDefault) {
			customer.addresses.forEach(
				(a) => (a.isDefault = a.id === params.addrId)
			);
			customer.primaryAddressId = params.addrId;
		}

		await customer.save();
		await logAudit(
			user.userId,
			'customer.address.update',
			'Customer',
			customer._id,
			{ address }
		);
		return successResponse({ address });
	}
);

/**
 * DELETE /api/customers/:id/addresses/:addrId - Remove address
 */
export const DELETE = withErrorHandler(
	async (
		request: NextRequest,
		{ params }: { params: { id: string; addrId: string } }
	) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		await dbConnect();

		const { authorized } = await requirePermission('customers.write')(
			request,
			user
		);

		const customer = await Customer.findById(params.id);
		if (!customer) return ErrorResponses.notFound('Customer not found');

		const isSelf =
			customer.userId && customer.userId.toString() === user.userId;
		if (!authorized && !isSelf) {
			return ErrorResponses.forbidden('Insufficient permissions');
		}

		const address = customer.addresses.find((a) => a.id === params.addrId);
		if (!address) return ErrorResponses.notFound('Address not found');

		// Prevent deleting primary address without reassignment
		if (
			customer.primaryAddressId === params.addrId &&
			customer.addresses.length > 1
		) {
			return ErrorResponses.badRequest(
				'Cannot delete primary address. Set another address as primary first.'
			);
		}

		customer.addresses = customer.addresses.filter(
			(a) => a.id !== params.addrId
		);
		if (customer.primaryAddressId === params.addrId) {
			customer.primaryAddressId = customer.addresses[0]?.id;
			if (customer.addresses[0]) {
				customer.addresses[0].isDefault = true;
			}
		}

		await customer.save();
		await logAudit(
			user.userId,
			'customer.address.delete',
			'Customer',
			customer._id,
			{ addressId: params.addrId }
		);
		return successResponse({ message: 'Address deleted' });
	}
);
