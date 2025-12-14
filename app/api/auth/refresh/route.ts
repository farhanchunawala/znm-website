import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import {
	getRefreshToken,
	verifyRefreshToken,
	createAccessToken,
	setAccessCookie,
	createRefreshToken,
	setRefreshCookie,
	revokeRefreshToken,
} from '@/lib/auth';
import User from '@/models/UserModel';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { withErrorHandler } from '@/lib/middleware/error-handler';

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
	// Get refresh token from cookie or body
	let refreshToken = await getRefreshToken();

	if (!refreshToken) {
		const body = await request.json();
		refreshToken = body.refreshToken;
	}

	if (!refreshToken) {
		return ErrorResponses.unauthorized('Refresh token required');
	}

	//  Verify refresh token
	const payload = await verifyRefreshToken(refreshToken);

	if (!payload) {
		return ErrorResponses.unauthorized('Invalid or expired refresh token');
	}

	// Connect to database
	await dbConnect();

	// Get user from database
	const user = await User.findById(payload.userId);

	if (!user) {
		return ErrorResponses.unauthorized('User not found');
	}

	// Check if user is active
	if (user.status !== 'active') {
		return ErrorResponses.forbidden('Account is suspended or deleted');
	}

	// Generate new access token
	const newAccessToken = await createAccessToken({
		userId: user._id.toString(),
		email: user.email,
		role: user.role,
	});

	// Set new access token cookie
	await setAccessCookie(newAccessToken);

	// Optional: Rotate refresh token (more secure)
	const rotateRefreshToken = true;
	let newRefreshToken = refreshToken;

	if (rotateRefreshToken) {
		// Revoke old refresh token
		await revokeRefreshToken(payload.tokenId);

		// Create new refresh token
		const deviceInfo = {
			userAgent: request.headers.get('user-agent') || undefined,
			ip:
				request.headers.get('x-forwarded-for')?.split(',')[0] ||
				request.headers.get('x-real-ip') ||
				undefined,
		};

		newRefreshToken = await createRefreshToken(
			user._id.toString(),
			deviceInfo
		);
		await setRefreshCookie(newRefreshToken);
	}

	// Update last login
	user.lastLogin = new Date();
	await user.save();

	return successResponse({
		accessToken: newAccessToken,
		...(rotateRefreshToken && { refreshToken: newRefreshToken }),
	});
});
