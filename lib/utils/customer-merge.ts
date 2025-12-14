import mongoose from 'mongoose';
import Customer, { type ICustomer } from '@/models/CustomerModel';
import MergeAudit from '@/models/MergeAuditModel';
import { hashAddress } from './customer-validation';

export interface MergePreview {
	targetCustomer: ICustomer;
	sourceCustomers: ICustomer[];
	mergedFields: Record<string, any>;
	conflicts: Array<{ field: string; values: any[]; chosen: any }>;
	addressesToAdd: any[];
	tagsToAdd: string[];
}

/**
 * Compute merge preview
 */
export async function computeMergePreview(
	target: ICustomer,
	sources: ICustomer[]
): Promise<MergePreview> {
	const conflicts: Array<{ field: string; values: any[]; chosen: any }> = [];
	const mergedFields: Record<string, any> = {};

	// Field-by-field winner selection (most recent non-null value)
	const allCustomers = [target, ...sources];
	const fields = ['email', 'phone', 'name', 'dob', 'gender'];

	fields.forEach((field) => {
		const values = allCustomers
			.filter((c) => c[field])
			.map((c) => ({ value: c[field], updatedAt: c.updatedAt }))
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

		if (values.length > 1) {
			conflicts.push({
				field,
				values: values.map((v) => v.value),
				chosen: values[0].value,
			});
		}

		mergedFields[field] = values[0]?.value || target[field];
	});

	// Merge addresses (deduplicate by hash)
	const addressHashes = new Set(target.addresses.map(hashAddress));
	const addressesToAdd = sources
		.flatMap((s) => s.addresses)
		.filter((addr) => !addressHashes.has(hashAddress(addr)));

	// Merge tags (union)
	const tagsToAdd = [...new Set(sources.flatMap((s) => s.tags))].filter(
		(tag) => !target.tags.includes(tag)
	);

	// Use most recent lastOrderAt
	const lastOrderAt = allCustomers
		.filter((c) => c.lastOrderAt)
		.sort(
			(a, b) => b.lastOrderAt!.getTime() - a.lastOrderAt!.getTime()
		)[0]?.lastOrderAt;

	if (lastOrderAt) mergedFields.lastOrderAt = lastOrderAt;

	return {
		targetCustomer: target,
		sourceCustomers: sources,
		mergedFields,
		conflicts,
		addressesToAdd,
		tagsToAdd,
	};
}

/**
 * Execute merge transaction
 */
export async function executeMerge(
	target: ICustomer,
	sources: ICustomer[],
	preview: MergePreview,
	actorId: string
) {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		// Store rollback data
		const rollbackData = {
			target: target.toObject(),
			sources: sources.map((s) => s.toObject()),
		};

		// Apply merged fields to target
		Object.assign(target, preview.mergedFields);
		target.addresses.push(...preview.addressesToAdd);
		target.tags.push(...preview.tagsToAdd);
		await target.save({ session });

		// Reassign orders, payments, refunds
		const Order = (await import('@/models/OrderModel')).default;
		const sourceIds = sources.map((s) => s._id);

		const orders = await Order.updateMany(
			{ customerId: { $in: sourceIds } },
			{ $set: { customerId: target._id } },
			{ session }
		);

		// Mark sources as merged
		await Customer.updateMany(
			{ _id: { $in: sourceIds } },
			{ $set: { status: 'merged', mergedInto: target._id } },
			{ session }
		);

		// Create merge audit record
		await MergeAudit.create(
			[
				{
					actorId,
					targetCustomerId: target._id,
					sourceCustomerIds: sourceIds,
					mergedData: target.toObject(),
					conflicts: preview.conflicts,
					reassignments: {
						orders: orders.modifiedCount,
						payments: 0,
						refunds: 0,
					},
					rollbackData,
					status: 'completed',
				},
			],
			{ session }
		);

		await session.commitTransaction();

		return {
			success: true,
			targetCustomerId: target._id,
			mergedCount: sources.length,
			reassignments: {
				orders: orders.modifiedCount,
				payments: 0,
				refunds: 0,
			},
		};
	} catch (error) {
		await session.abortTransaction();
		throw error;
	} finally {
		session.endSession();
	}
}

/**
 * Find duplicate candidates
 */
export async function findDuplicateCandidates(
	confidenceThreshold: number = 0.8,
	limit: number = 100
): Promise<
	Array<{ customers: ICustomer[]; confidence: number; reason: string }>
> {
	const candidates: Array<{
		customers: ICustomer[];
		confidence: number;
		reason: string;
	}> = [];

	// Find exact phone matches
	const phoneGroups = await Customer.aggregate([
		{
			$match: {
				phone: { $exists: true, $ne: null },
				status: 'active',
			},
		},
		{
			$group: {
				_id: '$phone',
				customers: { $push: '$$ROOT' },
				count: { $sum: 1 },
			},
		},
		{ $match: { count: { $gt: 1 } } },
		{ $limit: limit },
	]);

	phoneGroups.forEach((group) => {
		candidates.push({
			customers: group.customers,
			confidence: 1.0,
			reason: 'Exact phone match',
		});
	});

	// Find exact email matches
	const emailGroups = await Customer.aggregate([
		{
			$match: {
				email: { $exists: true, $ne: null },
				status: 'active',
			},
		},
		{
			$group: {
				_id: '$email',
				customers: { $push: '$$ROOT' },
				count: { $sum: 1 },
			},
		},
		{ $match: { count: { $gt: 1 } } },
		{ $limit: limit - candidates.length },
	]);

	emailGroups.forEach((group) => {
		candidates.push({
			customers: group.customers,
			confidence: 1.0,
			reason: 'Exact email match',
		});
	});

	return candidates.filter((c) => c.confidence >= confidenceThreshold);
}
