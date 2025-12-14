import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import {
	validateAddress,
	normalizePhone,
} from '@/lib/utils/customer-validation';
import { logAudit } from '@/lib/utils/audit';

/**
 * POST /api/customers/:id/addresses - Add address
 */
export const POST = withErrorHandler(
	async (request: NextRequest, { params }: { params: { id: string } }) => {
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

		const body = await request.json();

		// Validate address
		const validationError = validateAddress(body);
		if (validationError)
			return ErrorResponses.validationError(validationError);

		const newAddress = {
			id: new mongoose.Types.ObjectId().toHexString(),
			...body,
			phone: normalizePhone(body.phone),
			createdAt: new Date(),
		};

		// If isDefault, unset others
		if (newAddress.isDefault) {
			customer.addresses.forEach((addr) => (addr.isDefault = false));
			customer.primaryAddressId = newAddress.id;
		}

		// If this is the first address, make it default
		if (customer.addresses.length === 0) {
			newAddress.isDefault = true;
			customer.primaryAddressId = newAddress.id;
		}

		customer.addresses.push(newAddress);
		await customer.save();

		await logAudit(
			user.userId,
			'customer.address.add',
			'Customer',
			customer._id,
			{ address: newAddress }
		);
		return successResponse({ address: newAddress }, 201);
	}
);
