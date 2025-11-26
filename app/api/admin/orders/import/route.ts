import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';
import { parseCSV, validateOrderRow, groupOrdersByCustomer } from '@/lib/utils/csvParser';

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const csvContent = await file.text();
        const rows = parseCSV(csvContent);

        // Validate all rows
        const validationResults = rows.map(row => ({
            row,
            validation: validateOrderRow(row),
        }));

        const invalidRows = validationResults.filter(r => !r.validation.valid);
        if (invalidRows.length > 0) {
            return NextResponse.json({
                error: 'Validation failed',
                invalidRows: invalidRows.map(r => ({
                    row: r.row,
                    errors: r.validation.errors,
                })),
            }, { status: 400 });
        }

        // Group rows by order
        const groupedOrders = groupOrdersByCustomer(rows);
        const createdOrders = [];

        for (const [orderKey, orderRows] of groupedOrders.entries()) {
            const firstRow = orderRows[0];

            // Find or create customer
            let customer = await Customer.findOne({ customerId: firstRow.customerId });

            if (!customer) {
                // Create new customer
                customer = await Customer.create({
                    customerId: firstRow.customerId,
                    email: firstRow.customerEmail,
                    emails: [firstRow.customerEmail],
                    phone: firstRow.customerPhone,
                    phoneCode: firstRow.customerPhone.match(/^\+\d{1,4}/)?.[0] || '+91',
                    firstName: firstRow.firstName,
                    lastName: firstRow.lastName,
                    address: firstRow.address,
                    city: firstRow.city,
                    state: firstRow.state,
                    country: firstRow.country,
                    zipCode: firstRow.zipCode,
                });
            }

            // Generate order ID
            const orderCount = await Order.countDocuments();
            const orderId = firstRow.orderId || `ORD-${String(orderCount + 1).padStart(6, '0')}`;

            // Calculate total
            const items = orderRows.map(row => ({
                id: `item-${Date.now()}-${Math.random()}`,
                title: row.itemTitle,
                quantity: row.itemQuantity,
                size: row.itemSize,
                price: row.itemPrice,
                image: '',
            }));

            const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Create order
            const order = await Order.create({
                orderId,
                customerId: firstRow.customerId,
                items,
                shippingInfo: {
                    email: firstRow.customerEmail,
                    firstName: firstRow.firstName,
                    lastName: firstRow.lastName,
                    address: firstRow.address,
                    city: firstRow.city,
                    state: firstRow.state,
                    country: firstRow.country,
                    zipCode: firstRow.zipCode,
                    phone: firstRow.customerPhone,
                },
                total,
                paymentStatus: firstRow.paymentStatus,
                status: 'pending',
                notes: firstRow.notes,
            });

            createdOrders.push(order);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${createdOrders.length} orders`,
            orders: createdOrders,
        });
    } catch (error: any) {
        console.error('CSV import error:', error);
        return NextResponse.json({ error: error.message || 'Failed to import CSV' }, { status: 500 });
    }
}
