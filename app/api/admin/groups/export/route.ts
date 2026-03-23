import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Group from '@/models/GroupModel';
import { isAdminAuthenticated } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
	try {
		await dbConnect();
		const auth = await isAdminAuthenticated();
		if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

		const groups = await Group.find({}).lean();
		const headers = ['Name', 'Description', 'Members Count', 'Created At'];
		const rows = groups.map((g: any) => [
			`"${(g.name || '').replace(/"/g, '""')}"`,
			`"${(g.description || '').replace(/"/g, '""')}"`,
			g.members?.length || g.memberCount || 0,
			g.createdAt ? new Date(g.createdAt).toISOString() : '',
		]);

		const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename=groups-${new Date().toISOString().split('T')[0]}.csv`,
			},
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
