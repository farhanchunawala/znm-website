import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InventoryModel from '@/models/InventoryModel';
import Product from '@/models/ProductModel';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
	try {
		await dbConnect();
		const auth = await isAdminAuthenticated();
		if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const inventory = await InventoryModel.find({}).populate('productId', 'title sku').lean();
		const headers = ['Product Title', 'Product SKU', 'Variant SKU', 'Quantity', 'Location', 'Warehouse', 'Reserved', 'Created At'];
		const rows = inventory.map((item: any) => [
			`"${((item.productId?.title) || '').replace(/"/g, '""')}"`,
			item.productId?.sku || '',
			item.variantSku || '',
			item.qty ?? 0,
			`"${(item.location || '').replace(/"/g, '""')}"`,
			`"${(item.warehouse || '').replace(/"/g, '""')}"`,
			item.reserved ?? 0,
			item.createdAt ? new Date(item.createdAt).toISOString() : '',
		]);

		const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename=inventory-${new Date().toISOString().split('T')[0]}.csv`,
			},
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
