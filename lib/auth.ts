import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const SESSION_COOKIE_NAME = 'znm_session';

export interface SessionPayload extends JWTPayload {
    userId: string;
    email: string;
}

/**
 * Create a JWT token
 */
export async function createToken(payload: SessionPayload): Promise<string> {
    const token = await new SignJWT({ userId: payload.userId, email: payload.email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(SECRET_KEY);

    return token;
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
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
 * Set auth cookie
 */
export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });
}

/**
 * Get auth token from cookie
 */
export async function getAuthToken(): Promise<string | null> {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    return cookie?.value || null;
}

/**
 * Clear auth cookie
 */
export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
    const token = await getAuthToken();
    if (!token) return null;

    return await verifyToken(token);
}
