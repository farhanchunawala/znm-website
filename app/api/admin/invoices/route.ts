import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyAdminAuth } from '@/lib/auth';
import InvoiceService from '@/lib/services/invoiceService';
import mongoose from 'mongoose';

/**
 * GET /api/admin/invoices
 * List all invoices with filtering
 */
export async function GET(req: NextRequest) {
	try {
		await connectDB();

		// Verify admin auth
		const admin = await verifyAdminAuth(req);
		if (!admin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const customerId = searchParams.get('customerId');
		const status = searchParams.get('status');
		const paymentStatus = searchParams.get('paymentStatus');
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');
		const limit = parseInt(searchParams.get('limit') || '50');
		const skip = parseInt(searchParams.get('skip') || '0');
		const sortBy = searchParams.get('sortBy') || 'createdAt';
		const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

		const filters: any = {};
		if (customerId) {
			try {
				filters.customerId = new mongoose.Types.ObjectId(customerId);
			} catch {
				return NextResponse.json(
					{ error: 'Invalid customerId format' },
					{ status: 400 }
				);
			}
		}
		if (status) filters.status = status;
		if (paymentStatus) filters.paymentStatus = paymentStatus;

		if (startDate) {
			filters.startDate = new Date(startDate);
		}
		if (endDate) {
			filters.endDate = new Date(endDate);
		}

		const result = await InvoiceService.listInvoices(filters, {
			limit,
			skip,
			sort: { [sortBy]: sortOrder },
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error: any) {
		console.error('Error listing invoices:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/admin/invoices
 * Manually generate invoice for an order
 */
export async function POST(req: NextRequest) {
	try {
		await connectDB();

		// Verify admin auth
		const admin = await verifyAdminAuth(req);
		if (!admin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await req.json();
		const { orderId, generatePDF, paymentMethod, paymentId } = body;

		if (!orderId) {
			return NextResponse.json(
				{ error: 'orderId is required' },
				{ status: 400 }
			);
		}

		let orderIdObj: mongoose.Types.ObjectId;
		try {
			orderIdObj = new mongoose.Types.ObjectId(orderId);
		} catch {
			return NextResponse.json(
				{ error: 'Invalid orderId format' },
				{ status: 400 }
			);
		}

		const invoice = await InvoiceService.generateInvoice(orderIdObj, {
			generatePDF: generatePDF !== false,
			paymentMethod,
			paymentId: paymentId
				? new mongoose.Types.ObjectId(paymentId)
				: undefined,
		});

		return NextResponse.json(invoice, { status: 201 });
	} catch (error: any) {
		console.error('Error generating invoice:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}
