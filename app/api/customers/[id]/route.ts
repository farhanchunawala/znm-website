import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Customer from '@/models/CustomerModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { logAudit } from '@/lib/utils/audit';

/**
 * GET /api/customers/:id - Get customer profile
 * Requires: customers.read (or self-access)
 */
export const GET = withErrorHandler(
	async (request: NextRequest, { params }: { params: { id: string } }) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		await dbConnect();

		const { authorized } = await requirePermission('customers.read')(
			request,
			user
		);

		// Allow customers to view their own profile via userId link
		const customer = await Customer.findById(params.id).lean();
		if (!customer) return ErrorResponses.notFound('Customer not found');

		const isSelf =
			customer.userId && customer.userId.toString() === user.userId;
		if (!authorized && !isSelf) {
			return ErrorResponses.forbidden('Insufficient permissions');
		}

		// Optionally include recent orders
		const includeOrders =
			new URL(request.url).searchParams.get('includeOrders') === 'true';
		let recentOrders = [];

		if (includeOrders) {
			try {
				const Order = (await import('@/models/OrderModel')).default;
				recentOrders = await Order.find({ customerId: params.id })
					.sort('-createdAt')
					.limit(10)
					.select('orderId status total createdAt')
					.lean();
			} catch (e) {
				// Order model might not exist yet
				recentOrders = [];
			}
		}

		return successResponse({ customer, recentOrders });
	}
);

/**
 * PATCH /api/customers/:id - Update customer profile
 * Requires: customers.write (or self-access for limited fields)
 */
export const PATCH = withErrorHandler(
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
		const before = customer.toObject();

		// If self-access, restrict to safe fields
		if (isSelf && !authorized) {
			const allowedFields = ['name', 'dob', 'gender'];
			Object.keys(body).forEach((key) => {
				if (!allowedFields.includes(key)) delete body[key];
			});
		}

		Object.assign(customer, body);
		await customer.save();

		await logAudit(
			user.userId,
			'customer.update',
			'Customer',
			customer._id,
			{ before, after: customer }
		);
		return successResponse({ customer });
	}
);
