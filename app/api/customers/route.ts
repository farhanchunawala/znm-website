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
 * POST /api/customers - Create customer (upsert by phone/email optional)
 * Requires: customers.write
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
	const { error: authError, user } = await authenticateRequest(request);
	if (authError) return authError;

	const { authorized, error: permError } = await requirePermission(
		'customers.write'
	)(request, user);
	if (!authorized) return permError;

	await dbConnect();

	const body = await request.json();
	const { email, phone, name, upsert = false } = body;

	if (!name) {
		return ErrorResponses.badRequest('Name is required');
	}

	// Upsert logic: find by phone or email
	if (upsert && (phone || email)) {
		const existing = await Customer.findOne({
			$or: [
				...(phone ? [{ phone: normalizePhone(phone) }] : []),
				...(email ? [{ email: email.toLowerCase().trim() }] : []),
			],
			status: { $ne: 'merged' },
		});

		if (existing) {
			// Update existing
			Object.assign(existing, body);
			await existing.save();
			await logAudit(
				user.userId,
				'customer.update',
				'Customer',
				existing._id,
				{ after: existing }
			);
			return successResponse({ customer: existing });
		}
	}

	// Create new
	const customer = await Customer.create({
		...body,
		phone: phone ? normalizePhone(phone) : undefined,
		email: email ? email.toLowerCase().trim() : undefined,
	});

	await logAudit(user.userId, 'customer.create', 'Customer', customer._id, {
		after: customer,
	});
	return successResponse({ customer }, 201);
});

/**
 * GET /api/customers - List customers with filters
 * Requires: customers.read
 * Query params: tag, status, q (search), lastOrderFrom, lastOrderTo, page, limit, sort
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
	const { error: authError, user } = await authenticateRequest(request);
	if (authError) return authError;

	const { authorized, error: permError } = await requirePermission(
		'customers.read'
	)(request, user);
	if (!authorized) return permError;

	await dbConnect();

	const { searchParams } = new URL(request.url);
	const tag = searchParams.get('tag');
	const status = searchParams.get('status') || 'active';
	const q = searchParams.get('q');
	const lastOrderFrom = searchParams.get('lastOrderFrom');
	const lastOrderTo = searchParams.get('lastOrderTo');
	const page = parseInt(searchParams.get('page') || '1');
	const limit = parseInt(searchParams.get('limit') || '20');
	const sort = searchParams.get('sort') || '-createdAt';

	const query: Record<string, unknown> = { status };
	if (tag) query.tags = tag;
	if (lastOrderFrom || lastOrderTo) {
		query.lastOrderAt = {};
		if (lastOrderFrom)
			(query.lastOrderAt as Record<string, unknown>).$gte = new Date(
				lastOrderFrom
			);
		if (lastOrderTo)
			(query.lastOrderAt as Record<string, unknown>).$lte = new Date(
				lastOrderTo
			);
	}

	// Text search
	if (q) {
		// Prioritize exact phone/email match
		const exactMatch = await Customer.findOne({
			$or: [
				{ phone: normalizePhone(q) },
				{ email: q.toLowerCase().trim() },
			],
			status,
		}).lean();

		if (exactMatch) {
			return successResponse({
				customers: [exactMatch],
				pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
			});
		}

		// Fallback to text search
		query.$text = { $search: q };
	}

	const [customers, total] = await Promise.all([
		Customer.find(query)
			.select('-meta -addresses') // Exclude large fields
			.sort(sort)
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		Customer.countDocuments(query),
	]);

	return successResponse({
		customers,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
});
