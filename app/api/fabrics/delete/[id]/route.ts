import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Fabric from '@/models/FabricModel';

export async function DELETE(request: NextRequest, context: any) {
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
	} catch (error: unknown) {
		// Safely handle unknown errors
		let message = 'Unknown error';
		if (error instanceof Error) {
			message = error.message;
		}

		return NextResponse.json(
			{ error: 'Database operation failed', details: message },
			{
				status: 500,
			}
		);
	}
}
