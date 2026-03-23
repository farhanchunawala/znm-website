import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shipment from '@/models/ShipmentModel';
import { isAdminAuthenticated } from '@/lib/admin-auth';

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
		const trackingIdx = headers.indexOf('tracking id');
		const carrierIdx = headers.indexOf('carrier');
		const statusIdx = headers.indexOf('status');

		if (trackingIdx === -1) return NextResponse.json({ error: 'CSV must have a Tracking ID column' }, { status: 400 });

		let created = 0, updated = 0, errors: string[] = [];

		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			try {
				const trackingId = row[trackingIdx];
				if (!trackingId) continue;

				const existing = await Shipment.findOne({ trackingId });
				const data: any = { trackingId };
				if (carrierIdx >= 0 && row[carrierIdx]) data.carrier = row[carrierIdx];
				if (statusIdx >= 0 && row[statusIdx]) data.status = row[statusIdx];

				if (existing) {
					await Shipment.findByIdAndUpdate(existing._id, data);
					updated++;
				} else {
					await Shipment.create(data);
					created++;
				}
			} catch (err: any) {
				errors.push(`Row ${i + 1}: ${err.message}`);
			}
		}

		return NextResponse.json({ success: true, created, updated, errors });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
