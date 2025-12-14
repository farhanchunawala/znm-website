// app/api/users/[id]/route.ts - Get, update, delete specific user
import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/UserModel';
import { authenticateRequest } from '@/lib/middleware/auth-middleware';
import { requirePermission } from '@/lib/middleware/rbac';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { successResponse, ErrorResponses } from '@/lib/utils/response';
import { logAction } from '@/lib/utils/audit';
import { invalidateUserSessions } from '@/lib/utils/session';

/**
 * GET /api/users/[id] - Get user by ID
 */
export const GET = withErrorHandler(
	async (request: NextRequest, { params }: { params: { id: string } }) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		const { authorized, error: permError } = await requirePermission(
			'users.read'
		)(request, user);
		if (!authorized) return permError;

		await dbConnect();

		const targetUser = await User.findById(params.id).select(
			'-passwordHash -passwordChangedAt'
		);

		if (!targetUser) {
			return ErrorResponses.notFound('User not found');
		}

		// Workers can only view themselves
		if (
			user.roles.includes('worker') &&
			!user.roles.includes('manager') &&
			!user.roles.includes('admin')
		) {
			if (targetUser._id.toString() !== user.userId) {
				return ErrorResponses.forbidden(
					'Can only view your own profile'
				);
			}
		}

		return successResponse({ user: targetUser });
	}
);

/**
 * PATCH /api/users/[id] - Update user
 */
export const PATCH = withErrorHandler(
	async (request: NextRequest, { params }: { params: { id: string } }) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		const { authorized, error: permError } = await requirePermission(
			'users.update'
		)(request, user);
		if (!authorized) return permError;

		await dbConnect();

		const userId = params.id;
		const body = await request.json();
		const { name, phone, roles, status, meta } = body;

		const targetUser = await User.findById(userId);
		if (!targetUser) {
			return ErrorResponses.notFound('User not found');
		}

		const before = targetUser.toObject();

		// Update basic fields
		if (name) targetUser.name = name;
		if (phone) targetUser.phone = phone;
		if (meta) targetUser.meta = { ...targetUser.meta, ...meta };

		// Role changes require special permission
		if (roles) {
			const { authorized: roleAuth } = await requirePermission(
				'users.manage_roles'
			)(request, user);
			if (!roleAuth) {
				return ErrorResponses.forbidden('Cannot modify user roles');
			}

			// Managers can't promote to admin/manager
			if (
				user.roles.includes('manager') &&
				!user.roles.includes('admin')
			) {
				if (
					roles.some((r: string) => r === 'admin' || r === 'manager')
				) {
					return ErrorResponses.forbidden(
						'Cannot promote to admin/manager'
					);
				}
			}

			targetUser.roles = roles;
			await invalidateUserSessions(userId); // Invalidate on role change
		}

		// Status changes
		if (status && status !== targetUser.status) {
			targetUser.status = status;
			if (status === 'suspended' || status === 'deleted') {
				await invalidateUserSessions(userId);
			}
		}

		await targetUser.save();

		// Audit log
		await logAction(
			{
				actorId: user.userId,
				action: 'user.update',
				resource: 'User',
				resourceId: userId,
				changes: { before, after: targetUser.toObject() },
			},
			request
		);

		return successResponse({ user: targetUser });
	}
);

/**
 * DELETE /api/users/[id] - Soft delete user
 */
export const DELETE = withErrorHandler(
	async (request: NextRequest, { params }: { params: { id: string } }) => {
		const { error: authError, user } = await authenticateRequest(request);
		if (authError) return authError;

		const { authorized, error: permError } = await requirePermission(
			'users.delete'
		)(request, user);
		if (!authorized) return permError;

		await dbConnect();

		const userId = params.id;
		const targetUser = await User.findById(userId);

		if (!targetUser) {
			return ErrorResponses.notFound('User not found');
		}

		// Soft delete
		targetUser.status = 'deleted';
		await targetUser.save();

		// Invalidate sessions
		await invalidateUserSessions(userId);

		// Audit log
		await logAction(
			{
				actorId: user.userId,
				action: 'user.delete',
				resource: 'User',
				resourceId: userId,
				changes: { status: 'deleted' },
			},
			request
		);

		return successResponse({ message: 'User deleted successfully' });
	}
);
