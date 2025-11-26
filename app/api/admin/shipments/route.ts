import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shipment from '@/models/ShipmentModel';
import Order from '@/models/OrderModel';

// GET - List all shipments
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const archived = searchParams.get('archived') === 'true';
        const sort = searchParams.get('sort') || 'latest';

        const query: any = { archived };
        if (status && status !== 'all') {
            query.status = status;
        }

        let sortQuery: any = {};
        switch (sort) {
            case 'latest':
                sortQuery = { createdAt: -1 };
                break;
            case 'oldest':
                sortQuery = { createdAt: 1 };
                break;
            default:
                sortQuery = { createdAt: -1 };
        }

        const shipments = await Shipment.find(query)
            .populate('orderId', 'orderId total items')
            .populate('customerId', 'customerId firstName lastName email')
            .sort(sortQuery)
            .lean();

        return NextResponse.json(shipments);
    } catch (error) {
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
