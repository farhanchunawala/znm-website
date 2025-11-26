import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shipment from '@/models/ShipmentModel';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const { id } = params;
        const { archived } = await request.json();

        const shipment = await Shipment.findByIdAndUpdate(
            id,
            {
                archived,
                archivedAt: archived ? new Date() : null
            },
            { new: true }
        );

        if (!shipment) {
            return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
        }

        return NextResponse.json(shipment);
    } catch (error) {
        console.error('Failed to archive shipment:', error);
        return NextResponse.json({ error: 'Failed to archive shipment' }, { status: 500 });
    }
}
