import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/OrderModel';
import Customer from '@/models/CustomerModel';
import { sendOrderEmail, sendCustomerThankYouEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();
        const req = await request.json();
        const { formData, cartItems } = req;

        // Combine phone code and phone number for unique identifier, trimming spaces
        const cleanPhone = formData.phone.trim();
        const fullPhoneNumber = `${formData.phoneCode}${cleanPhone}`;

        // Debug log
        console.log('Customer lookup:', {
            phoneCode: formData.phoneCode,
            phone: cleanPhone,
            fullPhoneNumber,
            email: formData.email
        });

        // Find customer by full phone number (primary identifier)
        const existingCustomer = await Customer.findOne({ phone: fullPhoneNumber });

        console.log('Existing customer found:', existingCustomer ? {
            customerId: existingCustomer.customerId,
            phone: existingCustomer.phone,
            emails: existingCustomer.emails
        } : 'None');

        let customerId;
        if (existingCustomer) {
            // Use existing customer ID
            customerId = existingCustomer.customerId;

            // FORCE UPDATE: Use atomic findByIdAndUpdate to ensure data persistence
            // First, check if we need to fix the emails field (in case it's not an array in the DB)
            if (existingCustomer.emails && !Array.isArray(existingCustomer.emails)) {
                console.log('Fixing non-array emails field...');
                await Customer.updateOne(
                    { _id: existingCustomer._id },
                    { $set: { emails: [existingCustomer.emails] } } // Convert string to array
                );
            }

            const updateOps: any = {
                $set: {
                    phoneCode: formData.phoneCode,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    country: formData.country,
                    zipCode: formData.zipCode,
                    email: formData.email, // set primary email
                }
            };

            // Atomically add email if valid
            if (formData.email && formData.email.trim() !== '') {
                updateOps.$addToSet = { emails: formData.email.trim() };
            }

            console.log('Forcefully updating customer:', existingCustomer._id);
            const updatedCustomer = await Customer.findByIdAndUpdate(
                existingCustomer._id,
                updateOps,
                { new: true, runValidators: true }
            );

            console.log('Update complete. Current emails:', updatedCustomer?.emails);
        } else {
            // Generate sequential customer ID like znm-0001
            const latestCustomer = await Customer.findOne().sort({ createdAt: -1 }).exec();
            const lastNum = latestCustomer && latestCustomer.customerId ? parseInt(latestCustomer.customerId.replace('znm-', ''), 10) : 0;
            const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
            customerId = `znm-${String(nextNum).padStart(4, '0')}`;

            // Create new customer
            console.log('Creating new customer with email:', formData.email);
            const newCustomer = new Customer({
                customerId,
                email: formData.email, // primary email
                emails: [formData.email],
                phoneCode: formData.phoneCode,
                phone: fullPhoneNumber,
                firstName: formData.firstName,
                lastName: formData.lastName,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                zipCode: formData.zipCode,
            });
            const savedCustomer = await newCustomer.save();
            console.log('New customer saved:', {
                id: savedCustomer._id,
                emails: savedCustomer.emails
            });
        }

        // Generate order ID
        const latestOrder = await Order.findOne().sort({ createdAt: -1 }).exec();
        const lastOrderNum = latestOrder && latestOrder.orderId ? parseInt(latestOrder.orderId.replace('#znmon', ''), 10) : 0;
        const nextOrderNum = (isNaN(lastOrderNum) ? 0 : lastOrderNum) + 1;
        const orderId = `#znmon${String(nextOrderNum).padStart(4, '0')}`;

        const order = new Order({
            orderId,
            customerId,
            items: cartItems,
            shippingInfo: formData,
            total: req.total,
        });
        await order.save();

        // Log for debugging customer ID issues
        console.log('Order created:', {
            orderId,
            customerId,
            fullPhoneNumber,
            phoneCode: formData.phoneCode,
            phone: formData.phone,
            isExistingCustomer: !!existingCustomer
        });

        // Send email notification with complete shipping info including phoneCode and country
        await sendOrderEmail({
            orderId,
            customerId,
            email: formData.email,
            items: cartItems,
            total: req.total,
            shippingInfo: {
                ...formData,
                phoneCode: formData.phoneCode,
                country: formData.country,
            },
        });

        // Send thank you email to customer
        await sendCustomerThankYouEmail({
            orderId,
            customerId,
            email: formData.email,
            items: cartItems,
            total: req.total,
            shippingInfo: {
                ...formData,
                phoneCode: formData.phoneCode,
                country: formData.country,
            },
        });

        return NextResponse.json({ orderId, emailSent: true });
    } catch (error) {
        console.error('Order creation failed:', error);
        return NextResponse.json({ error: 'Order creation failed', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
    }
}
