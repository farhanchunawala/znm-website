import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Invoice from '@/models/InvoiceModel';
import mongoose from 'mongoose';

/**
 * GET /api/admin/invoices/:id/pdf
 * Download invoice PDF
 */
export async function GET(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		await connectDB();

		let invoiceId: mongoose.Types.ObjectId;
		try {
			invoiceId = new mongoose.Types.ObjectId(params.id);
		} catch {
			return NextResponse.json(
				{ error: 'Invalid invoice ID format' },
				{ status: 400 }
			);
		}

		const invoice = await Invoice.findById(invoiceId);
		if (!invoice) {
			return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
		}

		if (!invoice.pdfData) {
			return NextResponse.json(
				{ error: 'PDF not yet generated' },
				{ status: 404 }
			);
		}

		// Decode base64 PDF
		const pdfBuffer = Buffer.from(invoice.pdfData, 'base64');

		return new NextResponse(pdfBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
				'Cache-Control': 'public, max-age=31536000',
			},
		});
	} catch (error: any) {
		console.error('Error downloading PDF:', error);
		return NextResponse.json(
			{ error: error.message || 'Internal server error' },
			{ status: 500 }
		);
	}
}
