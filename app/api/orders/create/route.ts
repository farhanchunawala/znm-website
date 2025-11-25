import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '../../../models/OrderModel';
import Customer from '../../../models/CustomerModel';
import { sendOrderEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const req = await request.json();
        const { formData, cartItems } = req;

        // Find or create customer based on email or phone
        const existingCustomer = await Customer.findOne({
            $or: [{ email: formData.email }, { phone: formData.phone }],
        });
        let customerId;
        if (existingCustomer) {
            customerId = existingCustomer.customerId;
        } else {
            // Generate sequential customer ID like #zm-0001
            const latestCustomer = await Customer.findOne().sort({ createdAt: -1 }).exec();
            const lastNum = latestCustomer && latestCustomer.customerId ? parseInt(latestCustomer.customerId.replace('#zm-', ''), 10) : 0;
            const nextNum = lastNum + 1;
            customerId = `#zm-${nextNum}`;
        }
        if (existingCustomer) {
            // Update details (optional)
            await Customer.updateOne({ _id: existingCustomer._id }, { $set: formData });
        } else {
            const newCustomer = new Customer({
                customerId,
                ...formData,
            });
            await newCustomer.save();
        }

        // Generate order ID
        const latestOrder = await Order.findOne().sort({ createdAt: -1 }).exec();
        const lastOrderNum = latestOrder && latestOrder.orderId ? parseInt(latestOrder.orderId.replace('#znmon', ''), 10) : 0;
        const nextOrderNum = lastOrderNum + 1;
        const orderId = `#znmon${nextOrderNum}`;

        const order = new Order({
            orderId,
            customerId,
            items: cartItems,
            shippingInfo: formData,
            total: req.total,
        });
        await order.save();

        // Send email notification
        await sendOrderEmail({
            orderId,
            customerId,
            email: formData.email,
            items: cartItems,
            total: req.total,
        });

        return NextResponse.json({ orderId, emailSent: true });
    } catch (error) {
        console.error('Order creation failed:', error);
        return NextResponse.json({ error: 'Order creation failed', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
    }
}
