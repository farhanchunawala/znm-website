import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Shipment from '@/models/ShipmentModel';
import Order from '@/models/OrderModel';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();

        const { status, courierName, packagingProvider } = await request.json();

        const shipment: any = await Shipment.findById(params.id);
        if (!shipment) {
            return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
        }

        // Update shipment status and timestamps
        shipment.status = status;

        // Update carrier if provided
        if (courierName) {
            shipment.carrier = courierName;
        }

        if (status === 'fulfilled' && !shipment.fulfilledAt) {
            shipment.fulfilledAt = new Date();
        } else if (status === 'shipped' && !shipment.shippedAt) {
            shipment.shippedAt = new Date();

            // Generate and save invoice when shipping
            const order: any = await Order.findById(shipment.orderId).lean();
            if (order) {
                const { generateInvoicePDF } = await import('@/lib/invoice/generator');
                const { pdfBuffer, invoiceNumber } = await generateInvoicePDF(order, {
                    courierName: courierName || shipment.carrier,
                    packagingProvider,
                    saveToDatabase: true,
                });

                // Update order with invoice number
                await Order.findByIdAndUpdate(order._id, { invoiceNumber });

                // Send shipped email with invoice
                const { sendEmail } = await import('@/lib/email/sender');
                const { orderShippedEmail } = await import('@/lib/email/templates');

                await sendEmail({
                    to: order.shippingInfo.email,
                    subject: `Order ${order.orderId} Shipped - Invoice Attached`,
                    html: orderShippedEmail(order, shipment.trackingId, courierName || shipment.carrier),
                    attachments: [{
                        filename: `invoice-${order.orderId}.pdf`,
                        content: pdfBuffer,
                    }],
                });
            }
        } else if (status === 'outForDelivery' && !shipment.outForDeliveryAt) {
            shipment.outForDeliveryAt = new Date();

            // Send out for delivery email
            const order: any = await Order.findById(shipment.orderId).lean();
            if (order) {
                const { sendEmail } = await import('@/lib/email/sender');
                const { outForDeliveryEmail } = await import('@/lib/email/templates');

                await sendEmail({
                    to: order.shippingInfo.email,
                    subject: `Order ${order.orderId} Out for Delivery`,
                    html: outForDeliveryEmail(order, shipment.trackingId),
                });
            }
        } else if (status === 'delivered' && !shipment.deliveredAt) {
            shipment.deliveredAt = new Date();

            // Send delivered email with feedback link
            const order: any = await Order.findById(shipment.orderId).lean();
            if (order) {
                const { sendEmail } = await import('@/lib/email/sender');
                const { orderDeliveredEmail } = await import('@/lib/email/templates');

                await sendEmail({
                    to: order.shippingInfo.email,
                    subject: `Order ${order.orderId} Delivered - Share Your Feedback`,
                    html: orderDeliveredEmail(order),
                });
            }
        }

        await shipment.save();

        // Also update the corresponding order status
        const order: any = await Order.findById(shipment.orderId);
        if (order) {
            order.status = status;

            if (status === 'fulfilled' && !order.fulfilledAt) {
                order.fulfilledAt = new Date();

                // Send fulfilled email
                const { sendEmail } = await import('@/lib/email/sender');
                const { orderFulfilledEmail } = await import('@/lib/email/templates');

                await sendEmail({
                    to: order.shippingInfo.email,
                    subject: `Order ${order.orderId} Fulfilled`,
                    html: orderFulfilledEmail(order),
                });
            } else if (status === 'shipped' && !order.shippedAt) {
                order.shippedAt = new Date();
            } else if (status === 'outForDelivery' && !order.outForDeliveryAt) {
                order.outForDeliveryAt = new Date();
            } else if (status === 'delivered' && !order.deliveredAt) {
                order.deliveredAt = new Date();
            }

            await order.save();
        }

        return NextResponse.json({ success: true, shipment });
    } catch (error: any) {
        console.error('Failed to update shipment status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
