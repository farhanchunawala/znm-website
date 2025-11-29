import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const ADMIN_PASSWORD_HASH = '$2a$10$YourHashHere'; // Will be replaced with actual hash
const SESSION_COOKIE_NAME = 'znm_admin_session';

/**
 * Verify admin password
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
    // For simplicity, using direct comparison with env variable
    // In production, you'd use bcrypt.compare with a hashed password
    const adminPassword = process.env.ADMIN_PASSWORD || 'Chunawala';
    return password === adminPassword;
}

/**
 * Create admin session
 */
export async function createAdminSession() {
    const cookieStore = await cookies();
    const sessionToken = Buffer.from(`admin:${Date.now()}`).toString('base64');

    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });

    return sessionToken;
}

/**
 * Check if user is authenticated as admin
 */
export async function isAdminAuthenticated(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get(SESSION_COOKIE_NAME);
        return !!session?.value;
    } catch {
        return false;
    }
}

/**
 * Destroy admin session
 */
export async function destroyAdminSession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}
