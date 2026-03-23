import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InventoryModel from '@/models/InventoryModel';
import Product from '@/models/ProductModel';
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
		const skuIdx = headers.indexOf('product sku');
		const variantSkuIdx = headers.indexOf('variant sku');
		const qtyIdx = headers.indexOf('quantity');
		const locationIdx = headers.indexOf('location');
		const warehouseIdx = headers.indexOf('warehouse');

		if (skuIdx === -1) return NextResponse.json({ error: 'CSV must have a Product SKU column' }, { status: 400 });

		let created = 0, updated = 0, errors: string[] = [];

		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			try {
				const sku = row[skuIdx];
				if (!sku) continue;

				const product = await Product.findOne({ sku: sku.toUpperCase() });
				if (!product) { errors.push(`Row ${i + 1}: Product with SKU ${sku} not found`); continue; }

				const variantSku = variantSkuIdx >= 0 ? row[variantSkuIdx] : '';
				const existing = await InventoryModel.findOne({ productId: product._id, variantSku: variantSku || undefined });

				const data: any = { productId: product._id };
				if (variantSku) data.variantSku = variantSku;
				if (qtyIdx >= 0 && row[qtyIdx]) data.qty = parseInt(row[qtyIdx]);
				if (locationIdx >= 0 && row[locationIdx]) data.location = row[locationIdx];
				if (warehouseIdx >= 0 && row[warehouseIdx]) data.warehouse = row[warehouseIdx];

				if (existing) {
					await InventoryModel.findByIdAndUpdate(existing._id, data);
					updated++;
				} else {
					await InventoryModel.create(data);
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
