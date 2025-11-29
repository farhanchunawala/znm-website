interface Order {
    orderId: string;
    items: Array<{
        title: string;
        quantity: number;
        size: string;
        price: number;
    }>;
    total: number;
    invoiceNumber?: string;
    shippingInfo: {
        firstName: string;
        lastName: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
    };
}

interface Customer {
    firstName: string;
    lastName: string;
    email?: string;
    emails?: string[];
}

const getCustomerEmail = (customer: Customer): string => {
    return customer.email || customer.emails?.[0] || '';
};

const getCustomerName = (customer: Customer): string => {
    return `${customer.firstName} ${customer.lastName}`;
};

export function orderFulfilledEmail(order: Order, customer: Customer, invoiceUrl?: string): string {
    const customerEmail = getCustomerEmail(customer);
    const customerName = getCustomerName(customer);

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .item { padding: 10px 0; border-bottom: 1px solid #eee; }
        .item:last-child { border-bottom: none; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Fulfilled! 🎉</h1>
        </div>
        <div class="content">
            <p>Dear ${customerName},</p>
            <p>Great news! Your order <strong>#${order.orderId}</strong> has been fulfilled and is being prepared for shipment.</p>
            
            <div class="order-details">
                <h3>Order Details</h3>
                ${order.items.map(item => `
                    <div class="item">
                        <strong>${item.title}</strong><br>
                        Size: ${item.size} | Quantity: ${item.quantity} | ₹${item.price.toLocaleString()}
                    </div>
                `).join('')}
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #667eea;">
                    <strong>Total: ₹${order.total.toLocaleString()}</strong>
                </div>
            </div>

            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; text-align: center; color: #667eea; font-weight: 600;">
                    📄 Your invoice is attached to this email as a PDF
                </p>
            </div>

            <p>Your order will be shipped to our nearest hub soon. We'll notify you once it's on its way!</p>
            
            <p>Thank you for shopping with us!</p>
            
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

export function orderShippedEmail(order: Order, customer: Customer, trackingInfo?: { trackingId?: string; carrier?: string }): string {
    const customerName = getCustomerName(customer);

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .tracking-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .tracking-id { font-size: 24px; font-weight: bold; color: #f5576c; margin: 10px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Shipped! 📦</h1>
        </div>
        <div class="content">
            <p>Dear ${customerName},</p>
            <p>Excellent news! Your order <strong>#${order.orderId}</strong> has been shipped and is on its way to you.</p>
            
            ${trackingInfo?.trackingId ? `
                <div class="tracking-box">
                    <p>Tracking Number:</p>
                    <div class="tracking-id">${trackingInfo.trackingId}</div>
                    ${trackingInfo.carrier ? `<p>Carrier: ${trackingInfo.carrier}</p>` : ''}
                </div>
            ` : ''}

            <p>Your package will be out for delivery soon. Thank you for your patience!</p>
            
            <p>Best regards,<br>ZNM Team</p>
            
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

export function orderInLogisticsEmail(order: Order, customer: Customer): string {
    const customerName = getCustomerName(customer);

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .highlight { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #4facfe; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Out for Delivery! 🚚</h1>
        </div>
        <div class="content">
            <p>Dear ${customerName},</p>
            <p>Your order <strong>#${order.orderId}</strong> is now out for delivery!</p>
            
            <div class="highlight">
                <p><strong>Your package will be delivered to you soon.</strong></p>
                <p>Please ensure someone is available to receive the delivery.</p>
            </div>

            <p>Delivery Address:</p>
            <p>
                ${order.shippingInfo.address}<br>
                ${order.shippingInfo.city}, ${order.shippingInfo.state} ${order.shippingInfo.zipCode}
            </p>

            <p>Thank you for your patience!</p>
            
            <p>Best regards,<br>ZNM Team</p>
            
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

export function orderDeliveredEmail(order: Order, customer: Customer, feedbackLink: string): string {
    const customerName = getCustomerName(customer);

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background: white; padding: 30px; margin: 20px 0; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .button { display: inline-block; padding: 15px 40px; background: #43e97b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Delivered! ✅</h1>
        </div>
        <div class="content">
            <p>Dear ${customerName},</p>
            
            <div class="success-box">
                <h2>🎉 Your order has been delivered!</h2>
                <p>Order <strong>#${order.orderId}</strong></p>
            </div>

            <p>We hope you love your purchase! Your satisfaction is our top priority.</p>

            <p><strong>We'd love to hear from you!</strong></p>
            <p>Please take a moment to share your feedback about:</p>
            <ul>
                <li>Product Fitting</li>
                <li>Fabric Quality</li>
                <li>Our Service</li>
                <li>Delivery Experience</li>
            </ul>

            <p style="text-align: center;">
                <a href="${feedbackLink}" class="button">Share Your Feedback</a>
            </p>

            <p>Thank you for choosing us!</p>
            
            <p>Best regards,<br>ZNM Team</p>
            
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}
