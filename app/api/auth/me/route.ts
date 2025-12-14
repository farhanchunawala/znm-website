import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
	// Authenticate request
	const { error, user: authUser } = await authenticateRequest(request);

	if (error) {
		return error;
	}

	// Connect to database
	await dbConnect();

	// Get full user details from database
	const user = await User.findById(authUser!.userId).select('-passwordHash');

	if (!user) {
		return ErrorResponses.notFound('User not found');
	}

	// Check if user is active
	if (user.status !== 'active') {
		return ErrorResponses.forbidden('Account is suspended or deleted');
	}

	return successResponse({
		id: user._id,
		email: user.email,
		name: user.name,
		phone: user.phone,
		roles: user.roles,
		emailVerified: user.emailVerified,
		status: user.status,
		customerId: user.customerId,
		referralCode: user.referralCode,
		createdAt: user.createdAt,
		lastLogin: user.lastLogin,
	});
});
