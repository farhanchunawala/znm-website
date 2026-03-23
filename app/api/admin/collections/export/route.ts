import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
	try {
		await dbConnect();
		const auth = await isAdminAuthenticated();
		if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const Collection = mongoose.models.Collection || mongoose.model('Collection', new mongoose.Schema({}, { strict: false }), 'collections_list');
		const collections = await Collection.find({}).lean();

		const headers = ['Name', 'Slug', 'Description', 'Type', 'Created At'];
		const rows = collections.map((c: any) => [
			`"${(c.name || c.title || '').replace(/"/g, '""')}"`,
			c.slug || '',
			`"${(c.description || '').replace(/"/g, '""')}"`,
			c.type || 'manual',
			c.createdAt ? new Date(c.createdAt).toISOString() : '',
		]);

		const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename=collections-${new Date().toISOString().split('T')[0]}.csv`,
			},
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
