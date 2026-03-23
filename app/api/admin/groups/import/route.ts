import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/GroupModel';
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
		const nameIdx = headers.indexOf('name');
		const descIdx = headers.indexOf('description');

		if (nameIdx === -1) return NextResponse.json({ error: 'CSV must have a Name column' }, { status: 400 });

		let created = 0, updated = 0, errors: string[] = [];

		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			try {
				const name = row[nameIdx];
				if (!name) continue;

				const existing = await Group.findOne({ name });
				const data: any = { name };
				if (descIdx >= 0 && row[descIdx]) data.description = row[descIdx];

				if (existing) {
					await Group.findByIdAndUpdate(existing._id, data);
					updated++;
				} else {
					await Group.create(data);
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
