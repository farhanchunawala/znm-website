// app/api/users/route.ts - List and create users
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import Customer from '@/models/CustomerModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { hashPassword, validatePasswordStrength } from '@/lib/utils/password';
import { logAction } from '@/lib/utils/audit';

/**
 * GET /api/users - List users with pagination and filters
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
	// Authenticate
	const { error: authError, user } = await authenticateRequest(request);
	console.log('DEBUG: User object:', JSON.stringify(user, null, 2));
	if (authError) return authError;

	// Authorize - requires users.read permission
	const { authorized, error: permError } = await requirePermission(
		'users.read'
	)(request, user);
	if (!authorized) return permError;

	// Connect to database
	await dbConnect();

	// Parse query parameters
	const { searchParams } = new URL(request.url);
	const page = parseInt(searchParams.get('page') || '1');
	const limit = parseInt(searchParams.get('limit') || '20');
	const role = searchParams.get('role');
	const status = searchParams.get('status');
	const search = searchParams.get('search');

	// Build filter
	const filter: any = {};

	// Managers can only see workers (hierarchy check)
	if (user.roles.includes('manager') && !user.roles.includes('admin')) {
		filter.roles = 'worker';
	}

	if (role) filter.roles = role;
	if (status) filter.status = status;
	if (search) {
		filter.$or = [
			{ email: { $regex: search, $options: 'i' } },
			{ 'name.firstName': { $regex: search, $options: 'i' } },
			{ 'name.lastName': { $regex: search, $options: 'i' } },
		];
	}

	// Execute query
	const [users, total] = await Promise.all([
		User.find(filter)
			.select('-passwordHash -passwordChangedAt')
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		User.countDocuments(filter),
	]);

	return successResponse({
		users,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
});

/**
 * POST /api/users - Create new user
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
	const { error: authError, user } = await authenticateRequest(request);
	if (authError) return authError;

	const { authorized, error: permError } = await requirePermission(
		'users.create'
	)(request, user);
	if (!authorized) return permError;

	await dbConnect();

	const body = await request.json();
	const { email, password, name, phone, roles, meta, referralCode } = body;

	if (!email || !password) {
		return ErrorResponses.badRequest('Email and password are required');
	}

	// Validate password
	const passwordValidation = validatePasswordStrength(password);
	if (!passwordValidation.isValid) {
		return ErrorResponses.validationError({
			password: passwordValidation.errors,
		});
	}

	// Check if exists
	const existingUser = await User.findOne({ email: email.toLowerCase() });
	if (existingUser) {
		return ErrorResponses.conflict('User with this email already exists');
	}

	// Managers can only create workers
	if (user.roles.includes('manager') && !user.roles.includes('admin')) {
		if (roles && !roles.every((r: string) => r === 'worker')) {
			return ErrorResponses.forbidden('Managers can only create workers');
		}
	}

	const passwordHash = await hashPassword(password);

	const newUser = await User.create({
		email: email.toLowerCase(),
		passwordHash,
		name,
		phone,
		referralCode,
		roles: roles || ['customer'],
		meta,
		emailVerified: false,
		status: 'active',
	});

	// If creating a customer, also create Customer record
	if (newUser.roles.includes('customer')) {
		const customerCount = await Customer.countDocuments();
		const customerId = `ZNM-${String(customerCount + 1).padStart(4, '0')}`;

		await Customer.create({
			customerId,
			userId: newUser._id,
			emails: [email],
			phone,
			firstName: name?.firstName || '',
			lastName: name?.lastName || '',
		});

		newUser.customerId = customerId;
		await newUser.save();
	}

	// Audit log
	await logAction(
		{
			actorId: user.userId,
			action: 'user.create',
			resource: 'User',
			resourceId: newUser._id.toString(),
			changes: { after: newUser.toObject() },
		},
		request
	);

	return successResponse(
		{
			user: {
				id: newUser._id,
				email: newUser.email,
				name: newUser.name,
				roles: newUser.roles,
				status: newUser.status,
			},
		},
		201
	);
});
