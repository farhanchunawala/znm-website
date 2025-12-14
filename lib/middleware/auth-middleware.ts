import { NextRequest } from 'next/server';
import { verifyAccessToken } from '../auth';
import { errorResponse, ErrorResponses } from '../utils/response';

export interface AuthenticatedRequest extends NextRequest {
	user?: {
		userId: string;
		email: string;
		roles?: string[];
	};
}

/**
 * Middleware to require authentication
 * Verifies JWT from Authorization header
 */
export async function requireAuth(
	request: NextRequest
): Promise<{
	user: { userId: string; email: string; roles?: string[] };
} | null> {
	// Get token from Authorization header
	const authHeader = request.headers.get('authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null;
	}

	const token = authHeader.substring(7);

	// Verify token
	const payload = await verifyAccessToken(token);

	if (!payload) {
		return null;
	}

	return {
		user: {
			userId: payload.userId,
			email: payload.email,
			roles: payload.roles || [],
		},
	};
}

/**
 * Middleware to require specific roles
 */
export function requireRole(
	userRole: string | undefined,
	allowedRoles: string[]
): boolean {
	if (!userRole) {
		return false;
	}

	return allowedRoles.includes(userRole);
}

/**
 * Helper to get user from request or return error
 */
export async function authenticateRequest(request: NextRequest) {
	const auth = await requireAuth(request);

	if (!auth) {
		return {
			error: ErrorResponses.unauthorized('Authentication required'),
			user: null,
		};
	}

	return {
		error: null,
		user: auth.user,
	};
}

/**
 * Helper to check role or return error
 */
export function authorizeRole(
	userRole: string | undefined,
	allowedRoles: string[]
) {
	const hasAccess = requireRole(userRole, allowedRoles);

	if (!hasAccess) {
		return {
			error: ErrorResponses.forbidden('Insufficient permissions'),
			authorized: false,
		};
	}

	return {
		error: null,
		authorized: true,
	};
}
