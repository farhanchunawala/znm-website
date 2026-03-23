import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/ProductModel';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
	try {
		await dbConnect();
		const auth = await isAdminAuthenticated();
		if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const products = await Product.find({}).lean();

		const headers = ['Title', 'SKU', 'Slug', 'Description', 'Status', 'Tags', 'Variant SKUs', 'Variant Prices', 'Created At'];
		const rows = products.map((p: any) => [
			`"${(p.title || '').replace(/"/g, '""')}"`,
			p.sku || '',
			p.slug || '',
			`"${(p.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
			p.status || '',
			`"${(p.tags || []).join(', ')}"`,
			`"${(p.variants || []).map((v: any) => v.sku).join(', ')}"`,
			`"${(p.variants || []).map((v: any) => v.price).join(', ')}"`,
			p.createdAt ? new Date(p.createdAt).toISOString() : '',
		]);

		const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename=products-${new Date().toISOString().split('T')[0]}.csv`,
			},
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
