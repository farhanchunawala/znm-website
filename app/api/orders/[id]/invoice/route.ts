import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyCustomerAuth } from '@/lib/auth';
import Invoice from '@/models/InvoiceModel';
import mongoose from 'mongoose';

/**
 * GET /api/orders/:orderId/invoice
 * Customer view invoice for specific order
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

		let orderId: mongoose.Types.ObjectId;
		try {
			orderId = new mongoose.Types.ObjectId(params.id);
		} catch {
			return NextResponse.json(
				{ error: 'Invalid orderId format' },
				{ status: 400 }
			);
		}

		const invoice = await Invoice.findOne({
			orderId,
			customerId: customer.customerId,
			status: 'generated',
		}).populate('orderId');

		if (!invoice) {
			return NextResponse.json(
				{ error: 'Invoice not found for this order' },
				{ status: 404 }
			);
		}

		return NextResponse.json(invoice, { status: 200 });
	} catch (error: any) {
		console.error('Error fetching order invoice:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}
