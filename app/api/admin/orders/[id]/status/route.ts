import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';
import Shipment from '@/models/ShipmentModel';
import { sendEmail } from '@/lib/email/sender';
import { orderFulfilledEmail, orderShippedEmail, orderInLogisticsEmail, orderDeliveredEmail } from '@/lib/email/templates';
import { generateInvoiceHTML, generateInvoiceNumber } from '@/lib/invoice/generator';
import { generateFeedbackToken, generateFeedbackLink } from '@/lib/utils/feedbackToken';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const { id } = params;
        const { status } = await request.json();

        const order = await Order.findById(id);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const customer = await Customer.findOne({ customerId: order.customerId });
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        const previousStatus = order.status;
        // Update status and timestamp
        order.status = status;
        if (status === 'fulfilled') {
            order.fulfilledAt = new Date();
            // Generate invoice number if not exists
            if (!order.invoiceNumber) {
                order.invoiceNumber = generateInvoiceNumber();
            }
        } else if (status === 'shipped') {
            order.shippedAt = new Date();
        } else if (status === 'outForDelivery') {
            order.outForDeliveryAt = new Date();
        } else if (status === 'delivered') {
            order.deliveredAt = new Date();
        }

        await order.save();

        // Create or update shipment
        let shipment = await Shipment.findOne({ orderId: order._id });

        if (status === 'shipped' && !shipment) {
            // Create shipment when order is shipped
            shipment = await Shipment.create({
                shipmentId: `SHP-${order.orderId}`,
                orderId: order._id,
                customerId: customer._id,
                status: 'shipped',
                trackingId: `TRK-${order.orderId}`,
                carrier: 'Default Carrier',
                shippedAt: new Date(),
            });
        } else if (shipment) {
            // Update existing shipment status
            if (status === 'shipped') {
                shipment.status = 'shipped';
                shipment.shippedAt = new Date();
            } else if (status === 'outForDelivery') {
                shipment.status = 'outForDelivery';
                shipment.outForDeliveryAt = new Date();
            } else if (status === 'delivered') {
                shipment.status = 'delivered';
                shipment.deliveredAt = new Date();
            }
            await shipment.save();
        }

        // Send appropriate email
        const customerEmail = customer.email || customer.emails?.[0];
        if (customerEmail) {
            let emailHtml = '';
            let subject = '';
            let attachments: any[] = [];

            switch (status) {
                case 'fulfilled':
                    subject = `Order ${order.orderId} Fulfilled - Invoice Attached`;
                    emailHtml = orderFulfilledEmail(order, customer);

                    // Generate and attach PDF invoice
                    try {
                        const { generateInvoicePDF } = await import('@/lib/invoice/generator');
                        const pdfBuffer = await generateInvoicePDF(order);
                        attachments.push({
                            filename: `invoice-${order.invoiceNumber}.pdf`,
                            content: pdfBuffer,
                        });
                    } catch (err) {
                        console.error('Failed to generate PDF invoice:', err);
                    }
                    break;
                case 'shipped':
                    subject = `Order ${order.orderId} Shipped`;
                    emailHtml = orderShippedEmail(order, customer, {
                        trackingId: shipment?.trackingId || '',
                        carrier: shipment?.carrier || '',
                    });
                    break;
                case 'outForDelivery':
                    subject = `Order ${order.orderId} Out for Delivery`;
                    emailHtml = orderInLogisticsEmail(order, customer);
                    break;
                case 'delivered':
                    subject = `Order ${order.orderId} Delivered`;
                    const feedbackToken = await generateFeedbackToken(order._id.toString(), customer._id.toString());
                    const feedbackLink = generateFeedbackLink(order._id.toString(), customer._id.toString(), feedbackToken);
                    emailHtml = orderDeliveredEmail(order, customer, feedbackLink);
                    break;
            }

            if (emailHtml) {
                await sendEmail({
                    to: customerEmail,
                    subject,
                    html: emailHtml,
                    attachments: attachments.length > 0 ? attachments : undefined,
                });
            }
        }

        return NextResponse.json({
            success: true,
            order,
            message: `Order status updated to ${status}`,
        });
    } catch (error: any) {
        console.error('Failed to update order status:', error);
        return NextResponse.json({ error: error.message || 'Failed to update order status' }, { status: 500 });
    }
}
