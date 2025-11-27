import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shipment from '@/models/ShipmentModel';
import Order from '@/models/OrderModel';

// GET - List all shipments
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const archived = searchParams.get('archived') === 'true';
        const sort = searchParams.get('sort') || 'latest';

        const query: any = archived ? { archived: true } : { archived: { $ne: true } };

        let shipments = await Shipment.find(query)
            .populate({
                path: 'orderId',
                select: 'orderId status total items shippingInfo',
            })
            .populate({
                path: 'customerId',
                select: 'customerId firstName lastName email',
            })
            .lean();

        // Sort
        if (sort === 'latest') {
            shipments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (sort === 'oldest') {
            shipments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }

        return NextResponse.json(shipments);
    } catch (error: any) {
        console.error('Failed to fetch shipments:', error);
        return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
    }
}

// POST - Create shipment (fulfill order)
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { orderId, customerId, notes } = await request.json();

        if (!orderId || !customerId) {
            return NextResponse.json({ error: 'Order ID and Customer ID are required' }, { status: 400 });
        }

        // Generate shipment ID
        const lastShipment = await Shipment.findOne().sort({ createdAt: -1 });
        let shipmentNumber = 1;
        if (lastShipment && lastShipment.shipmentId) {
            const lastNumber = parseInt(lastShipment.shipmentId.split('-')[1]);
            shipmentNumber = lastNumber + 1;
        }
        const shipmentId = `SHP-${String(shipmentNumber).padStart(4, '0')}`;

        const newShipment = new Shipment({
            shipmentId,
            orderId,
            customerId,
            status: 'fulfilled',
            fulfilledAt: new Date(),
            notes,
        });

        await newShipment.save();

        // Send order shipped email
        const order = await Order.findById(orderId).lean();
        if (order) {
            const { sendOrderShippedEmail } = await import('@/lib/email');
            await sendOrderShippedEmail(order);
        }

        return NextResponse.json({ success: true, shipment: newShipment });
    } catch (error) {
        console.error('Failed to create shipment:', error);
        return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 });
    }
}
