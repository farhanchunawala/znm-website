// lib/utils/session.ts - Session management utilities
import User from '@/models/UserModel';
import RefreshToken from '@/models/RefreshTokenModel';
import { clearPermissionsCache } from '@/lib/middleware/rbac';

/**
 * Invalidate all user sessions
 * Call this when password changes or roles are updated
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
	// Update passwordChangedAt to invalidate all existing JWTs
	await User.updateOne({ _id: userId }, { passwordChangedAt: new Date() });

	// Revoke all refresh tokens
	await RefreshToken.updateMany({ userId }, { revoked: true });

	// Clear permissions cache
	clearPermissionsCache(userId);
}

/**
 * Check if a JWT was issued before the last password change
 */
export async function isTokenValid(
	userId: string,
	iat: number
): Promise<boolean> {
	const user = await User.findById(userId).select('passwordChangedAt');
	if (!user) return false;

	if (user.passwordChangedAt) {
		const changedTimestamp = Math.floor(
			user.passwordChangedAt.getTime() / 1000
		);
		return iat > changedTimestamp;
	}

	return true;
}
