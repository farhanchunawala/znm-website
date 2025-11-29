import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import { generateInvoicePDF, generateInvoiceNumber } from '@/lib/invoice/generator';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const { id } = params;

        const order = await Order.findById(id);
        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Generate invoice number if not exists
        if (!order.invoiceNumber) {
            order.invoiceNumber = generateInvoiceNumber();
            await order.save();
        }

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(order);

        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${order.invoiceNumber}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('Failed to generate invoice:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate invoice' }, { status: 500 });
    }
}
