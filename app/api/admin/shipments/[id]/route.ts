import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shipment from '@/models/ShipmentModel';
import Order from '@/models/OrderModel';
import { sendTrackingAvailableEmail, sendOrderDeliveredEmail } from '@/lib/email';

// GET - Fetch shipment details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const { id } = params;

        const shipment = await Shipment.findById(id)
            .populate('orderId')
            .populate('customerId');

        if (!shipment) {
            return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
        }

        return NextResponse.json(shipment);
    } catch (error) {
        console.error('Failed to fetch shipment:', error);
        return NextResponse.json({ error: 'Failed to fetch shipment' }, { status: 500 });
    }
}

// PUT - Update shipment
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const { status, trackingId, carrier, notes } = await request.json();
        const { id } = params;

        const shipment = await Shipment.findById(id).populate('orderId');

        if (!shipment) {
            return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
        }

        const updateData: any = {};

        if (status) {
            updateData.status = status;

            if (status === 'shipped' && !shipment.shippedAt) {
                updateData.shippedAt = new Date();
            }

            if (status === 'delivered' && !shipment.deliveredAt) {
                updateData.deliveredAt = new Date();

                // Send delivery confirmation email
                const order = await Order.findById(shipment.orderId).lean();
                if (order) {
                    await sendOrderDeliveredEmail(order);
                }
            }
        }

        if (trackingId !== undefined) {
            updateData.trackingId = trackingId;

            // If tracking ID is being added for the first time, send email
            if (trackingId && !shipment.trackingId) {
                const order = await Order.findById(shipment.orderId).lean();
                if (order) {
                    await sendTrackingAvailableEmail(order, trackingId, carrier);
                }
            }
        }

        if (carrier !== undefined) updateData.carrier = carrier;
        if (notes !== undefined) updateData.notes = notes;

        const updatedShipment = await Shipment.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return NextResponse.json({ success: true, shipment: updatedShipment });
    } catch (error) {
        console.error('Failed to update shipment:', error);
        return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 });
    }
}

// DELETE - Cancel/delete shipment
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const { id } = params;

        const deletedShipment = await Shipment.findByIdAndDelete(id);

        if (!deletedShipment) {
            return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete shipment:', error);
        return NextResponse.json({ error: 'Failed to delete shipment' }, { status: 500 });
    }
}
