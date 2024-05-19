import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Fabric from '@/models/FabricModel';

interface Context {
	params: {
		id: number;
	};
}

export async function DELETE(request: NextRequest, context: Context) {
	try {
		await dbConnect();
		const { id } = context.params;
		const fabric = await Fabric.findOneAndDelete({
			fabricId: id,
		});

		if (!fabric) {
			return NextResponse.json(
				{ error: 'Fabric not found' },
				{
					status: 404,
				}
			);
		}

		return NextResponse.json({
			message: 'Fabric deleted successfully',
			fabric,
		});
	} catch (error) {
		console.error('Database operation failed:', error);
		return NextResponse.json(
			{ error: 'Database operation failed', details: error.message },
			{
				status: 500,
			}
		);
	}
}
