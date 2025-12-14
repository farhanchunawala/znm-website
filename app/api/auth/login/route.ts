import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import { comparePassword } from '@/lib/utils/password';
import {
	createAccessToken,
	createRefreshToken,
	setAccessCookie,
	setRefreshCookie,
} from '@/lib/auth';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { rateLimiters } from '@/lib/middleware/rate-limiter';

export const POST = withErrorHandler(async (request: NextRequest) => {
	// Rate limiting - prevent brute force attacks
	const rateLimitCheck = await rateLimiters.auth(request);
	if (!rateLimitCheck.allowed) {
		return rateLimitCheck.error;
	}

	const body = await request.json();
	const { email, phone, password } = body;

	// Validate input
	if (!email || !password) {
		return ErrorResponses.badRequest('Email and password are required');
	}

	// Connect to database
	await dbConnect();

	// Find user by email
	const user = await User.findOne({ email: email.toLowerCase() });

	if (!user) {
		// Use generic error message to prevent user enumeration
		return ErrorResponses.unauthorized('Invalid credentials');
	}

	// Check account status
	if (user.status === 'suspended') {
		return ErrorResponses.forbidden(
			'Your account has been suspended. Please contact support.'
		);
	}

	if (user.status === 'deleted') {
		return ErrorResponses.forbidden('This account no longer exists');
	}

	// Verify password
	const isValidPassword = await comparePassword(password, user.passwordHash);

	if (!isValidPassword) {
		return ErrorResponses.unauthorized('Invalid credentials');
	}

	// Get device info for refresh token tracking
	const deviceInfo = {
		userAgent: request.headers.get('user-agent') || undefined,
		ip:
			request.headers.get('x-forwarded-for')?.split(',')[0] ||
			request.headers.get('x-real-ip') ||
			undefined,
	};

	// Generate access and refresh tokens
	// Generate access and refresh tokens
	const accessToken = await createAccessToken({
		userId: user._id.toString(),
		email: user.email,
		roles: Array.from(user.roles || []),
	});

	const refreshToken = await createRefreshToken(
		user._id.toString(),
		deviceInfo
	);

	// Set auth cookies
	await setAccessCookie(accessToken);
	await setRefreshCookie(refreshToken);

	// Update last login
	user.lastLogin = new Date();
	await user.save();

	return successResponse({
		user: {
			id: user._id.toString(),
			email: user.email,
			name: user.name,
			roles: Array.from(user.roles || []),
			customerId: user.customerId,
		},
		accessToken,
		refreshToken,
	});
});
