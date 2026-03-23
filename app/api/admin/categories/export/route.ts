import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/CategoryModel';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
	try {
		await dbConnect();
		const auth = await isAdminAuthenticated();
		if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const categories = await Category.find({}).lean();
		const headers = ['Name', 'Slug', 'Description', 'Image', 'Created At'];
		const rows = categories.map((c: any) => [
			`"${(c.name || '').replace(/"/g, '""')}"`,
			c.slug || '',
			`"${(c.description || '').replace(/"/g, '""')}"`,
			c.image || '',
			c.createdAt ? new Date(c.createdAt).toISOString() : '',
		]);

		const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename=categories-${new Date().toISOString().split('T')[0]}.csv`,
			},
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
