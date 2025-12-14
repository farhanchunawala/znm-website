import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import mongoose from 'mongoose';
import RefreshToken from '@/models/RefreshTokenModel';

const SECRET_KEY = new TextEncoder().encode(
	process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

const SESSION_COOKIE_NAME = 'znm_session';
const REFRESH_COOKIE_NAME = 'znm_refresh';

export interface SessionPayload extends JWTPayload {
	userId: string;
	email: string;
	roles?: string[];
}

export interface RefreshPayload extends JWTPayload {
	userId: string;
	tokenId: string;
}

/**
 * Create an access JWT token (short-lived)
 */
export async function createAccessToken(
	payload: SessionPayload
): Promise<string> {
	const token = await new SignJWT({
		userId: payload.userId,
		email: payload.email,
		roles: payload.roles,
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(ACCESS_TOKEN_EXPIRY)
		.sign(SECRET_KEY);

	return token;
}

/**
 * Create a refresh JWT token (long-lived)
 */
export async function createRefreshToken(
	userId: string,
	deviceInfo?: { userAgent?: string; ip?: string }
): Promise<string> {
	const expiryDate = new Date();
	expiryDate.setDate(
		expiryDate.getDate() + (REFRESH_TOKEN_EXPIRY === '30d' ? 30 : 7)
	);

	// Generate a new ObjectId for the token document
	const tokenId = new mongoose.Types.ObjectId();

	const token = await new SignJWT({
		userId,
		tokenId: tokenId.toString(),
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(REFRESH_TOKEN_EXPIRY)
		.sign(SECRET_KEY);

	// Create refresh token document with the generated ID and token
	await RefreshToken.create({
		_id: tokenId,
		userId,
		token,
		expiresAt: expiryDate,
		deviceInfo,
	});

	return token;
}

/**
 * Verify an access JWT token
 */
export async function verifyAccessToken(
	token: string
): Promise<SessionPayload | null> {
	try {
		const { payload } = await jwtVerify(token, SECRET_KEY);
		if (payload.userId && payload.email) {
			return payload as SessionPayload;
		}
		return null;
	} catch (error) {
		return null;
	}
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(
	token: string
): Promise<RefreshPayload | null> {
	try {
		const { payload } = await jwtVerify(token, SECRET_KEY);
		if (!payload.userId || !payload.tokenId) {
			return null;
		}

		// Check if token exists in database and is not revoked
		const refreshTokenDoc = await RefreshToken.findOne({
			_id: payload.tokenId,
			userId: payload.userId,
			revoked: false,
		});

		if (!refreshTokenDoc) {
			return null;
		}

		// Check expiration
		if (new Date() > refreshTokenDoc.expiresAt) {
			return null;
		}

		return payload as RefreshPayload;
	} catch (error) {
		return null;
	}
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(tokenId: string): Promise<boolean> {
	try {
		await RefreshToken.updateOne({ _id: tokenId }, { revoked: true });
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<boolean> {
	try {
		await RefreshToken.updateMany({ userId }, { revoked: true });
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Set access token cookie
 */
export async function setAccessCookie(token: string) {
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 15, // 15 minutes
		path: '/',
	});
}

/**
 * Set refresh token cookie
 */
export async function setRefreshCookie(token: string) {
	const cookieStore = await cookies();
	cookieStore.set(REFRESH_COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30, // 30 days
		path: '/',
	});
}

/**
 * Get access token from cookie
 */
export async function getAccessToken(): Promise<string | null> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(SESSION_COOKIE_NAME);
	return cookie?.value || null;
}

/**
 * Get refresh token from cookie
 */
export async function getRefreshToken(): Promise<string | null> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(REFRESH_COOKIE_NAME);
	return cookie?.value || null;
}

/**
 * Clear all auth cookies
 */
export async function clearAuthCookies() {
	const cookieStore = await cookies();
	cookieStore.delete(SESSION_COOKIE_NAME);
	cookieStore.delete(REFRESH_COOKIE_NAME);
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
	const token = await getAccessToken();
	if (!token) return null;

	return await verifyAccessToken(token);
}

/**
 * Deprecated - use createAccessToken
 */
export async function createToken(payload: SessionPayload): Promise<string> {
	return createAccessToken(payload);
}

/**
 * Deprecated - use verifyAccessToken
 */
export async function verifyToken(
	token: string
): Promise<SessionPayload | null> {
	return verifyAccessToken(token);
}

/**
 * Deprecated - use setAccessCookie
 */
export async function setAuthCookie(token: string) {
	return setAccessCookie(token);
}

/**
 * Deprecated - use getAccessToken
 */
export async function getAuthToken(): Promise<string | null> {
	return getAccessToken();
}

/**
 * Deprecated - use clearAuthCookies
 */
export async function clearAuthCookie() {
	return clearAuthCookies();
}
