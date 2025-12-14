// lib/utils/audit.ts - Audit logging utility
import AuditLog from '@/models/AuditLogModel';
import { NextRequest } from 'next/server';

export interface AuditLogData {
	actorId: string;
	action: string;
	resource: string;
	resourceId?: string;
	changes?: any;
	status?: 'success' | 'failure';
	errorMessage?: string;
}

/**
 * Log an action to the audit log
 */
export async function logAction(
	data: AuditLogData,
	request: NextRequest
): Promise<void> {
	try {
		await AuditLog.create({
			actorId: data.actorId,
			action: data.action,
			resource: data.resource,
			resourceId: data.resourceId,
			changes: data.changes,
			metadata: {
				ip:
					request.headers.get('x-forwarded-for')?.split(',')[0] ||
					request.headers.get('x-real-ip') ||
					'unknown',
				userAgent: request.headers.get('user-agent') || 'unknown',
				method: request.method,
				endpoint: request.url,
			},
			status: data.status || 'success',
			errorMessage: data.errorMessage,
		});
	} catch (error) {
		console.error('Failed to create audit log:', error);
		// Don't throw - audit logging shouldn't break the request
	}
}

/**
 * Log failed action
 */
export async function logFailedAction(
	data: Omit<AuditLogData, 'status'>,
	request: NextRequest,
	errorMessage: string
): Promise<void> {
	await logAction({ ...data, status: 'failure', errorMessage }, request);
}

/**
 * Simple audit logging without request context
 * Used by customer routes and other utilities
 */
export async function logAudit(
	actorId: string,
	action: string,
	resource: string,
	resourceId: any,
	changes?: any
): Promise<void> {
	try {
		await AuditLog.create({
			actorId,
			action,
			resource,
			resourceId: resourceId?.toString(),
			changes,
			metadata: {},
			status: 'success',
		});
	} catch (error) {
		console.error('Failed to create audit log:', error);
		// Don't throw - audit logging shouldn't break the request
	}
}
