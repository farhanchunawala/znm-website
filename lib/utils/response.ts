import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		code?: string;
		details?: any;
	};
	meta?: {
		timestamp: string;
		[key: string]: any;
	};
}

/**
 * Create a successful API response
 */
export function successResponse<T>(
	data: T,
	status: number = 200,
	meta?: Record<string, any>
): NextResponse<ApiResponse<T>> {
	const response: ApiResponse<T> = {
		success: true,
		data,
		meta: {
			timestamp: new Date().toISOString(),
			...meta,
		},
	};

	return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function errorResponse(
	message: string,
	status: number = 400,
	code?: string,
	details?: any
): NextResponse<ApiResponse> {
	const response: ApiResponse = {
		success: false,
		error: {
			message,
			code,
			details,
		},
		meta: {
			timestamp: new Date().toISOString(),
		},
	};

	return NextResponse.json(response, { status });
}

/**
 * Common error responses
 */
export const ErrorResponses = {
	unauthorized: (message = 'Unauthorized') =>
		errorResponse(message, 401, 'UNAUTHORIZED'),

	forbidden: (message = 'Forbidden') =>
		errorResponse(message, 403, 'FORBIDDEN'),

	notFound: (message = 'Resource not found') =>
		errorResponse(message, 404, 'NOT_FOUND'),

	badRequest: (message = 'Bad request', details?: any) =>
		errorResponse(message, 400, 'BAD_REQUEST', details),

	conflict: (message = 'Resource already exists') =>
		errorResponse(message, 409, 'CONFLICT'),

	serverError: (message = 'Internal server error') =>
		errorResponse(message, 500, 'INTERNAL_ERROR'),

	validationError: (errors: any) =>
		errorResponse('Validation failed', 422, 'VALIDATION_ERROR', errors),

	rateLimitExceeded: (message = 'Too many requests') =>
		errorResponse(message, 429, 'RATE_LIMIT_EXCEEDED'),
};
