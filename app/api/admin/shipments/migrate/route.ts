import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Shipment from '@/models/ShipmentModel';
import Customer from '@/models/CustomerModel';

// Force create shipments for all orders
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        // Delete all existing shipments first (for clean migration)
        await Shipment.deleteMany({});
        console.log('Cleared all existing shipments');

        // Find all orders
        const orders = await Order.find({}).lean();
        console.log(`Found ${orders.length} orders`);

        const createdShipments = [];
        let shipmentNumber = 1;

        for (const order of orders) {
            // Get customer by customerId string
            const customer = await Customer.findOne({ customerId: order.customerId }).lean();
            if (!customer) {
                console.log(`Customer ${order.customerId} not found for order ${order.orderId}`);
                continue;
            }

            // Generate shipment ID
            const shipmentId = `SHP-${String(shipmentNumber).padStart(6, '0')}`;
            shipmentNumber++;

            // Create shipment with same status as order
            const newShipment = new Shipment({
                shipmentId,
                orderId: order._id,
                customerId: customer._id,
                status: order.status || 'pending',
                trackingId: `TRK-${order.orderId}`,
                carrier: order.status === 'pending' ? 'Pending Assignment' : 'Default Carrier',
                shippedAt: order.shippedAt,
                outForDeliveryAt: order.outForDeliveryAt,
                deliveredAt: order.deliveredAt,
            });

            await newShipment.save();
            createdShipments.push(newShipment);
            console.log(`Created shipment ${shipmentId} for order ${order.orderId}`);
        }

        return NextResponse.json({
            success: true,
            message: `Created ${createdShipments.length} shipments`,
            shipments: createdShipments,
        });
    } catch (error: any) {
        console.error('Migration failed:', error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
