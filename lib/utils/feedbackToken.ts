import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export interface FeedbackTokenPayload {
    orderId: string;
    customerId: string;
    exp?: number;
}

export async function generateFeedbackToken(orderId: string, customerId: string): Promise<string> {
    const token = await new SignJWT({ orderId, customerId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('90d') // Token valid for 90 days
        .setIssuedAt()
        .sign(secret);

    return token;
}

export async function verifyFeedbackToken(token: string): Promise<FeedbackTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as FeedbackTokenPayload;
    } catch (error) {
        console.error('Invalid feedback token:', error);
        return null;
    }
}

export function generateFeedbackLink(orderId: string, customerId: string, token: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/feedback/${token}`;
}
