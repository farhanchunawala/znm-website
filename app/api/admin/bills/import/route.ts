import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import mongoose from 'mongoose';

const BillModel = mongoose.models.Bill || mongoose.model('Bill', new mongoose.Schema({}, { strict: false }), 'bills');

function parseCSV(text: string): string[][] {
	const lines = text.split('\n').filter(l => l.trim());
	return lines.map(line => {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			if (line[i] === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; }
			else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
			else { current += line[i]; }
		}
		result.push(current.trim());
		return result;
	});
}

export async function POST(req: NextRequest) {
	try {
		await dbConnect();
		const auth = await isAdminAuthenticated();
		if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const formData = await req.formData();
		const file = formData.get('file') as File;
		if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

		const text = await file.text();
		const rows = parseCSV(text);
		if (rows.length < 2) return NextResponse.json({ error: 'CSV must have header + data rows' }, { status: 400 });

		const headers = rows[0].map(h => h.toLowerCase().trim());
		const vendorIdx = headers.indexOf('vendor');
		const amountIdx = headers.indexOf('amount');
		const statusIdx = headers.indexOf('status');
		const dueDateIdx = headers.indexOf('due date');
		const notesIdx = headers.indexOf('notes');

		if (vendorIdx === -1) return NextResponse.json({ error: 'CSV must have a Vendor column' }, { status: 400 });

		let created = 0, errors: string[] = [];

		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			try {
				const vendor = row[vendorIdx];
				if (!vendor) continue;

				const data: any = { vendorName: vendor };
				if (amountIdx >= 0 && row[amountIdx]) data.total = parseFloat(row[amountIdx]);
				if (statusIdx >= 0 && row[statusIdx]) data.status = row[statusIdx];
				if (dueDateIdx >= 0 && row[dueDateIdx]) data.dueDate = new Date(row[dueDateIdx]);
				if (notesIdx >= 0 && row[notesIdx]) data.description = row[notesIdx];

				await BillModel.create(data);
				created++;
			} catch (err: any) {
				errors.push(`Row ${i + 1}: ${err.message}`);
			}
		}

		return NextResponse.json({ success: true, created, errors });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
