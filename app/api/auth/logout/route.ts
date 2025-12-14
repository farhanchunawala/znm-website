import { NextRequest } from 'next/server';
import {
	clearAuthCookies,
	getRefreshToken,
	verifyRefreshToken,
	revokeRefreshToken,
} from '@/lib/auth';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { withErrorHandler } from '@/lib/middleware/error-handler';

export const POST = withErrorHandler(async (request: NextRequest) => {
	// Try to get refresh token from cookie or body
	let refreshToken = await getRefreshToken();

	if (!refreshToken) {
		const body = await request.json().catch(() => ({}));
		refreshToken = body.refreshToken;
	}

	// If we have a refresh token, revoke it
	if (refreshToken) {
		const payload = await verifyRefreshToken(refreshToken);
		if (payload) {
			await revokeRefreshToken(payload.tokenId);
		}
	}

	// Clear all auth cookies
	await clearAuthCookies();

	return successResponse({
		message: 'Logged out successfully',
	});
});
