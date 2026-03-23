import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import mongoose from 'mongoose';

const BillModel = mongoose.models.Bill || mongoose.model('Bill', new mongoose.Schema({}, { strict: false }), 'bills');

export async function GET(req: NextRequest) {
	try {
		await dbConnect();
		const auth = await isAdminAuthenticated();
		if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const bills = await BillModel.find({}).lean();
		const headers = ['Bill Number', 'Vendor', 'Amount', 'Status', 'Due Date', 'Paid Date', 'Notes', 'Created At'];
		const rows = bills.map((b: any) => [
			b.billNumber || b._id?.toString() || '',
			`"${(b.vendor || b.vendorName || '').replace(/"/g, '""')}"`,
			b.amount || b.total || 0,
			b.status || '',
			b.dueDate ? new Date(b.dueDate).toISOString() : '',
			b.paidDate ? new Date(b.paidDate).toISOString() : '',
			`"${(b.notes || b.description || '').replace(/"/g, '""')}"`,
			b.createdAt ? new Date(b.createdAt).toISOString() : '',
		]);

		const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename=bills-${new Date().toISOString().split('T')[0]}.csv`,
			},
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
