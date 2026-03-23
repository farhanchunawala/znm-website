import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAdminAuth } from '@/lib/admin-auth';
import InvoiceService from '@/lib/services/invoiceService';
import Invoice from '@/models/InvoiceModel';
import mongoose from 'mongoose';

export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await connectDB();

		// Verify admin auth
		const admin = await verifyAdminAuth();
		if (!admin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		let invoiceId: mongoose.Types.ObjectId;
		try {
			invoiceId = new mongoose.Types.ObjectId(params.id);
		} catch {
			return NextResponse.json(
				{ error: 'Invalid invoice ID format' },
				{ status: 400 }
			);
		}

		const invoice = await InvoiceService.getInvoice(invoiceId);
		if (!invoice) {
			return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
		}

		return NextResponse.json(invoice, { status: 200 });
	} catch (error: any) {
		console.error('Error fetching invoice:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}

/**
 * PATCH /api/admin/invoices/:id
 * Regenerate invoice or update status
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await connectDB();

		// Verify admin auth
		const admin = await verifyAdminAuth();
		if (!admin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await req.json();
		const { action, reason } = body;

		let invoiceId: mongoose.Types.ObjectId;
		try {
			invoiceId = new mongoose.Types.ObjectId(params.id);
		} catch {
			return NextResponse.json(
				{ error: 'Invalid invoice ID format' },
				{ status: 400 }
			);
		}

		if (action === 'regenerate') {
			const newInvoice = await InvoiceService.regenerateInvoice(invoiceId);
			return NextResponse.json(newInvoice, { status: 200 });
		} else if (action === 'cancel') {
			if (!reason) {
				return NextResponse.json(
					{ error: 'reason is required for cancellation' },
					{ status: 400 }
				);
			}
			const cancelled = await InvoiceService.cancelInvoice(
				invoiceId,
				reason,
				undefined
			);
			return NextResponse.json(cancelled, { status: 200 });
		} else {
			return NextResponse.json(
				{ error: 'Invalid action. Use "regenerate" or "cancel"' },
				{ status: 400 }
			);
		}
	} catch (error: any) {
		console.error('Error updating invoice:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}

/**
 * DELETE /api/admin/invoices/:id
 * Soft delete invoice (set status to cancelled)
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await connectDB();

		// Verify admin auth
		const admin = await verifyAdminAuth();
		if (!admin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		let invoiceId: mongoose.Types.ObjectId;
		try {
			invoiceId = new mongoose.Types.ObjectId(params.id);
		} catch {
			return NextResponse.json(
				{ error: 'Invalid invoice ID format' },
				{ status: 400 }
			);
		}

		const deleted = await InvoiceService.cancelInvoice(
			invoiceId,
			'Admin deletion',
			undefined
		);

		return NextResponse.json(deleted, { status: 200 });
	} catch (error: any) {
		console.error('Error deleting invoice:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}
