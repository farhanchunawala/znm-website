import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyCustomerAuth } from '@/lib/auth';
import Invoice from '@/models/InvoiceModel';
import Order from '@/models/OrderModel';
import mongoose from 'mongoose';

/**
 * GET /api/invoices/:id
 * Customer view own invoice
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await connectDB();

		// Verify customer auth
		const customer = await verifyCustomerAuth(req);
		if (!customer) {
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

		const invoice = await Invoice.findById(invoiceId)
			.populate('orderId')
			.populate('customerId');

		if (!invoice) {
			return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
		}

		// Verify ownership
		if (!invoice.customerId._id.equals(customer.customerId)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
