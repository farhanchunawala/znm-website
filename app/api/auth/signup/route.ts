import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import Customer from '@/models/CustomerModel';
import {
	createAccessToken,
	createRefreshToken,
	setAccessCookie,
	setRefreshCookie,
} from '@/lib/auth';
import { hashPassword, validatePasswordStrength } from '@/lib/utils/password';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { rateLimiters } from '@/lib/middleware/rate-limiter';
import { sendWelcomeEmail } from '@/lib/email';

export const POST = withErrorHandler(async (request: NextRequest) => {
	// Rate limiting - prevent spam signups
	const rateLimitCheck = await rateLimiters.auth(request);
	if (!rateLimitCheck.allowed) {
		return rateLimitCheck.error;
	}

	const body = await request.json();
	const { username, email, phone, phoneCode, password } = body;

	// Validate required fields
	if (!username || !email || !password || !phone) {
		return ErrorResponses.badRequest('All fields are required');
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return ErrorResponses.badRequest('Invalid email format');
	}

	// Validate password strength
	const passwordValidation = validatePasswordStrength(password);
	if (!passwordValidation.isValid) {
		return ErrorResponses.badRequest(passwordValidation.errors.join('. '));
	}

	// Connect to database
	await dbConnect();

	// Check if user already exists
	const existingUser = await User.findOne({
		$or: [{ email: email.toLowerCase() }, { phone }],
	});

	if (existingUser) {
		return ErrorResponses.conflict(
			'User with this email or phone already exists'
		);
	}

	// Generate customer ID
	const customerCount = await Customer.countDocuments();
	const customerId = `ZNM-${String(customerCount + 1).padStart(4, '0')}`;

	// Hash password with bcrypt (12 rounds)
	const passwordHash = await hashPassword(password);

	// Get device info for refresh token tracking
	const deviceInfo = {
		userAgent: request.headers.get('user-agent') || undefined,
		ip:
			request.headers.get('x-forwarded-for')?.split(',')[0] ||
			request.headers.get('x-real-ip') ||
			undefined,
	};

	// Create new user
	const newUser = await User.create({
		name: {
			firstName: username,
			middleName: '',
			lastName: '',
		},
		email: email.toLowerCase(),
		phone,
		passwordHash,
		customerId,
		roles: ['customer'],
		emailVerified: false,
		status: 'active',
	});

	// Create customer record
	await Customer.create({
		customerId,
		userId: newUser._id,
		name: username,
		email: email.toLowerCase(),
		phone,
		status: 'active',
		tags: [],
		addresses: [],
	});

	// Generate access and refresh tokens
	const accessToken = await createAccessToken({
		userId: newUser._id.toString(),
		email: newUser.email,
		roles: newUser.roles,
	});

	const refreshToken = await createRefreshToken(
		newUser._id.toString(),
		deviceInfo
	);

	// Set auth cookies
	await setAccessCookie(accessToken);
	await setRefreshCookie(refreshToken);

	// Send welcome email (non-blocking)
	sendWelcomeEmail(email, username).catch((err) =>
		console.error('Failed to send welcome email:', err)
	);

	// Return success response
	return successResponse(
		{
			message: 'Thank you for joining us! Welcome to Zoll & Metér.',
			user: {
				id: newUser._id.toString(),
				email: newUser.email,
				name: `${newUser.name.firstName} ${newUser.name.middleName} ${newUser.name.lastName}`.trim(),
				customerId: newUser.customerId,
			},
		},
		201
	);
});
