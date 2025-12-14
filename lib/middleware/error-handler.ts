import { NextResponse } from 'next/server';
import { errorResponse } from '../utils/response';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
	constructor(
		public statusCode: number,
		message: string,
		public code?: string,
		public details?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/**
 * Handle errors in API routes
 * Usage: wrap your route handler with this function
 */
export function withErrorHandler<T>(
	handler: (request: Request, ...args: unknown[]) => Promise<T>
) {
	return async (request: Request, ...args: unknown[]) => {
		try {
			return await handler(request, ...args);
		} catch (error) {
			console.error('API Error:', error);

			// Handle ApiError
			if (error instanceof ApiError) {
				return errorResponse(
					error.message,
					error.statusCode,
					error.code,
					error.details
				);
			}

			// Handle Mongoose validation errors
			if (error && typeof error === 'object' && 'name' in error) {
				const err = error as {
					name: string;
					message: string;
					errors?: unknown;
				};
				if (err.name === 'ValidationError') {
					// Convert Mongoose errors object to a serializable format
					const errorMessages =
						err.errors && typeof err.errors === 'object'
							? Object.values(err.errors as Record<string, any>)
									.map((e: any) => e.message || String(e))
									.join('. ')
							: err.message;

					return errorResponse(
						errorMessages || 'Validation failed',
						422,
						'VALIDATION_ERROR'
					);
				}

				if (err.name === 'MongoServerError') {
					// Duplicate key error
					if ('code' in error && error.code === 11000) {
						return errorResponse(
							'Resource already exists',
							409,
							'DUPLICATE_KEY'
						);
					}
				}
			}

			// Handle unknown errors
			const message =
				process.env.NODE_ENV === 'production'
					? 'Internal server error'
					: error instanceof Error
						? error.message
						: 'Unknown error';

			return errorResponse(message, 500, 'INTERNAL_ERROR');
		}
	};
}

/**
 * Validate request body against a schema
 */
export function validateBody<T>(
	body: unknown,
	validator: (data: unknown) => {
		success: boolean;
		data?: T;
		errors?: unknown;
	}
): T {
	const result = validator(body);

	if (!result.success || !result.data) {
		throw new ApiError(
			422,
			'Validation failed',
			'VALIDATION_ERROR',
			result.errors
		);
	}

	return result.data;
}
