import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';
import Shipment from '@/models/ShipmentModel';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const orderData = await request.json();

        // Validate customer exists
        const customer = await Customer.findOne({ customerId: orderData.customerId });
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Create order with pending status
        const newOrder = new Order({
            ...orderData,
            status: 'pending',
        });

        await newOrder.save();

        // Auto-create pending shipment for this order
        const shipmentCount = await Shipment.countDocuments();
        const shipmentId = `SHP-${String(shipmentCount + 1).padStart(6, '0')}`;

        const newShipment = new Shipment({
            shipmentId,
            orderId: newOrder._id,
            customerId: customer._id,
            status: 'pending',
            trackingId: `TRK-${newOrder.orderId}`,
            carrier: 'Pending Assignment',
        });

        await newShipment.save();

        return NextResponse.json({ success: true, order: newOrder, shipment: newShipment });
    } catch (error: any) {
        console.error('Failed to create order:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
