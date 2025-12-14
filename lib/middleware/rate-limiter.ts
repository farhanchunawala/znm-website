import { NextRequest } from 'next/server';
import { ErrorResponses } from '../utils/response';

// In-memory store for rate limiting
// For production, use Redis or a distributed cache
const requestCounts = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxRequests: number; // Maximum requests per window
}

/**
 * Simple in-memory rate limiter
 */
export function rateLimit(config: RateLimitConfig) {
	return async (request: NextRequest) => {
		// Get identifier (IP address or user ID from token)
		const identifier = getIdentifier(request);

		const now = Date.now();
		const record = requestCounts.get(identifier);

		// If no record exists or the window has expired, create a new one
		if (!record || now > record.resetTime) {
			requestCounts.set(identifier, {
				count: 1,
				resetTime: now + config.windowMs,
			});
			return { allowed: true, error: null };
		}

		// Increment the count
		record.count++;

		// Check if limit exceeded
		if (record.count > config.maxRequests) {
			return {
				allowed: false,
				error: ErrorResponses.rateLimitExceeded(
					`Too many requests. Please try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds.`
				),
			};
		}

		return { allowed: true, error: null };
	};
}

/**
 * Get identifier for rate limiting (IP address preferably)
 */
function getIdentifier(request: NextRequest): string {
	// Try to get IP from various headers (works with most proxies/load balancers)
	const forwardedFor = request.headers.get('x-forwarded-for');
	const realIp = request.headers.get('x-real-ip');
	const cfConnectingIp = request.headers.get('cf-connecting-ip');

	if (forwardedFor) {
		return forwardedFor.split(',')[0].trim();
	}

	if (realIp) {
		return realIp;
	}

	if (cfConnectingIp) {
		return cfConnectingIp;
	}

	// Fallback to a generic identifier
	return 'unknown';
}

/**
 * Cleanup old entries periodically (call this in a background job)
 */
export function cleanupRateLimitStore() {
	const now = Date.now();
	for (const [key, record] of requestCounts.entries()) {
		if (now > record.resetTime) {
			requestCounts.delete(key);
		}
	}
}

/**
 * Predefined rate limiters
 */
export const rateLimiters = {
	// Strict limit for auth endpoints (10 requests per 15 minutes)
	auth: rateLimit({
		windowMs: 15 * 60 * 1000,
		maxRequests: 10,
	}),

	// More lenient for general API (100 requests per minute)
	api: rateLimit({
		windowMs: 60 * 1000,
		maxRequests: 100,
	}),

	// Very strict for password reset (3 requests per hour)
	passwordReset: rateLimit({
		windowMs: 60 * 60 * 1000,
		maxRequests: 3,
	}),
};

// Cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
