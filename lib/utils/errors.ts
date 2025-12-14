import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ============================================================================
// ERROR CLASS DEFINITIONS
// ============================================================================

/**
 * Application-level error with HTTP status code and error code
 */
export class AppError extends Error {
	public statusCode: number;
	public errorCode: string;

	constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_ERROR') {
		super(message);
		this.statusCode = statusCode;
		this.errorCode = errorCode;
		Object.setPrototypeOf(this, AppError.prototype);
	}
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
	public details: Record<string, string[]>;

	constructor(message: string, details: Record<string, string[]> = {}) {
		super(message, 400, 'VALIDATION_ERROR');
		this.details = details;
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends AppError {
	constructor(message: string = 'Resource not found') {
		super(message, 404, 'NOT_FOUND');
		Object.setPrototypeOf(this, NotFoundError.prototype);
	}
}

/**
 * Authentication/Authorization error (401/403)
 */
export class AuthenticationError extends AppError {
	constructor(message: string = 'Unauthorized', statusCode: number = 401) {
		super(message, statusCode, statusCode === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED');
		Object.setPrototypeOf(this, AuthenticationError.prototype);
	}
}

/**
 * Database error (503)
 */
export class DatabaseError extends AppError {
	constructor(message: string = 'Database operation failed') {
		super(message, 503, 'DATABASE_ERROR');
		Object.setPrototypeOf(this, DatabaseError.prototype);
	}
}

// ============================================================================
// ERROR HANDLER FUNCTION
// ============================================================================

interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: Record<string, string[]>;
		statusCode: number;
	};
	timestamp: string;
}

/**
 * Standardized error handler for API routes
 *
 * Converts various error types into standardized JSON responses with proper
 * HTTP status codes and error codes for frontend consumption.
 *
 * @param error - The error object to handle
 * @returns NextResponse with standardized error format
 *
 * @example
 * try {
 *   // ... your logic
 * } catch (error) {
 *   return handleError(error);
 * }
 */
export function handleError(error: unknown): NextResponse<ErrorResponse> {
	let statusCode = 500;
	let errorCode = 'INTERNAL_ERROR';
	let message = 'An unexpected error occurred';
	let details: Record<string, string[]> | undefined;

	// Handle AppError subclasses
	if (error instanceof ValidationError) {
		statusCode = 400;
		errorCode = 'VALIDATION_ERROR';
		message = error.message;
		details = error.details;
	} else if (error instanceof NotFoundError) {
		statusCode = 404;
		errorCode = 'NOT_FOUND';
		message = error.message;
	} else if (error instanceof AuthenticationError) {
		statusCode = error.statusCode;
		errorCode = error.errorCode;
		message = error.message;
	} else if (error instanceof DatabaseError) {
		statusCode = 503;
		errorCode = 'DATABASE_ERROR';
		message = error.message;
	} else if (error instanceof AppError) {
		statusCode = error.statusCode;
		errorCode = error.errorCode;
		message = error.message;
	}
	// Handle Zod validation errors
	else if (error instanceof ZodError) {
		statusCode = 400;
		errorCode = 'VALIDATION_ERROR';
		message = 'Request validation failed';
		details = error.errors.reduce(
			(acc, err) => {
				const path = err.path.join('.');
				if (!acc[path]) acc[path] = [];
				acc[path].push(err.message);
				return acc;
			},
			{} as Record<string, string[]>
		);
	}
	// Handle standard Error
	else if (error instanceof Error) {
		message = error.message;

		// Detect specific error types from message
		if (error.message.includes('MongoDB') || error.message.includes('database')) {
			statusCode = 503;
			errorCode = 'DATABASE_ERROR';
		} else if (error.message.includes('not found')) {
			statusCode = 404;
			errorCode = 'NOT_FOUND';
		} else if (error.message.includes('validation')) {
			statusCode = 400;
			errorCode = 'VALIDATION_ERROR';
		}
	}

	// Log error for debugging
	if (statusCode >= 500) {
		console.error(`[${errorCode}] ${message}`, error);
	} else {
		console.warn(`[${errorCode}] ${message}`);
	}

	const response: ErrorResponse = {
		success: false,
		error: {
			code: errorCode,
			message,
			...(details && { details }),
			statusCode,
		},
		timestamp: new Date().toISOString(),
	};

	return NextResponse.json(response, { status: statusCode });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Assert condition is truthy, throw ValidationError if not
 */
export function assert(
	condition: unknown,
	message: string,
	details: Record<string, string[]> = {}
): asserts condition {
	if (!condition) {
		throw new ValidationError(message, details);
	}
}

/**
 * Throw NotFoundError if value is null or undefined
 */
export function assertFound<T>(value: T | null | undefined, message: string = 'Resource not found'): T {
	if (value == null) {
		throw new NotFoundError(message);
	}
	return value;
}

/**
 * Throw DatabaseError for database operations
 */
export function throwDatabaseError(message: string): never {
	throw new DatabaseError(message);
}
