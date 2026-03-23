import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Invoice from '@/models/InvoiceModel';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
	try {
		await dbConnect();
		const auth = await isAdminAuthenticated();
		if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const invoices = await Invoice.find({}).populate('orderId', 'orderNumber').populate('customerId', 'firstName lastName email').lean();
		const headers = ['Invoice Number', 'Order Number', 'Customer Name', 'Customer Email', 'Grand Total', 'Status', 'Payment Status', 'Created At'];
		const rows = invoices.map((inv: any) => [
			inv.invoiceNumber || '',
			inv.orderId?.orderNumber || '',
			`"${((inv.customerId?.firstName || '') + ' ' + (inv.customerId?.lastName || '')).trim()}"`,
			inv.customerId?.email || '',
			inv.totalsSnapshot?.grandTotal || 0,
			inv.status || '',
			inv.paymentStatus || '',
			inv.createdAt ? new Date(inv.createdAt).toISOString() : '',
		]);

		const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename=invoices-${new Date().toISOString().split('T')[0]}.csv`,
			},
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
