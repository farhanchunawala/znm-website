import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/ProductModel';
import { isAdminAuthenticated } from '@/lib/admin-auth';

function parseCSV(text: string): string[][] {
	const lines = text.split('\n').filter(l => l.trim());
	return lines.map(line => {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			if (line[i] === '"') {
				if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
				else inQuotes = !inQuotes;
			} else if (line[i] === ',' && !inQuotes) {
				result.push(current.trim()); current = '';
			} else { current += line[i]; }
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
		const titleIdx = headers.indexOf('title');
		const skuIdx = headers.indexOf('sku');
		const descIdx = headers.indexOf('description');
		const statusIdx = headers.indexOf('status');
		const tagsIdx = headers.indexOf('tags');

		if (titleIdx === -1) return NextResponse.json({ error: 'CSV must have a Title column' }, { status: 400 });

		let created = 0, updated = 0, errors: string[] = [];

		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			try {
				const title = row[titleIdx];
				if (!title) continue;

				const sku = skuIdx >= 0 ? row[skuIdx] : '';
				const existing = sku ? await Product.findOne({ sku: sku.toUpperCase() }) : null;

				const data: any = { title };
				if (descIdx >= 0 && row[descIdx]) data.description = row[descIdx];
				if (statusIdx >= 0 && row[statusIdx]) data.status = row[statusIdx];
				if (tagsIdx >= 0 && row[tagsIdx]) data.tags = row[tagsIdx].split(',').map((t: string) => t.trim());

				if (existing) {
					await Product.findByIdAndUpdate(existing._id, data);
					updated++;
				} else {
					const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
					await Product.create({ ...data, sku: sku || title.substring(0, 8).toUpperCase().replace(/\s/g, '-'), slug });
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
