import nodemailer from 'nodemailer';

// Create a transporter
// For production, you need to provide actual SMTP credentials
// For development/demo, we'll use a mock configuration or just log to console if no creds
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'user',
        pass: process.env.SMTP_PASS || 'pass',
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: EmailOptions) => {
    try {
        // If no real credentials are provided (checking a dummy value), just log
        if (!process.env.SMTP_HOST && !process.env.SMTP_USER) {
            console.log('---------------------------------------------------');
            console.log(`[MOCK EMAIL] To: ${to}`);
            console.log(`[MOCK EMAIL] Subject: ${subject}`);
            console.log(`[MOCK EMAIL] Body: ${text || 'HTML Content'}`);
            console.log('---------------------------------------------------');
            return { success: true, message: 'Mock email sent' };
        }

        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Zoll & Metér" <noreply@zollandmeter.com>',
            to,
            subject,
            text,
            html,
        });

        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to prevent blocking the main flow
        return { success: false, error };
    }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
    const subject = 'Welcome to Zoll & Metér!';
    const text = `Dear ${name},\n\nThank you for joining Zoll & Metér. We are delighted to have you with us.\n\nExplore our latest collection of Sherwanis and more at our website.\n\nBest Regards,\nThe Zoll & Metér Team`;

    const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #000;">Welcome to Zoll & Metér</h1>
      <p>Dear ${name},</p>
      <p>Thank you for creating an account with us. We are delighted to welcome you to our exclusive community.</p>
      <p>At Zoll & Metér, we strive to provide you with the finest quality and designs.</p>
      <div style="margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Start Shopping</a>
      </div>
      <p>If you have any questions, feel free to reply to this email.</p>
      <p>Best Regards,<br>The Zoll & Metér Team</p>
    </div>
  `;

    return sendEmail({ to: email, subject, text, html });
};

export const sendNewsletterAdminNotification = async (subscriberEmail: string) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@zollandmeter.com';
    const subject = 'New Newsletter Subscription';
    const text = `A new user has subscribed to the newsletter: ${subscriberEmail}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
            <h2>New Newsletter Subscriber</h2>
            <p><strong>Email:</strong> ${subscriberEmail}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
    `;

    return sendEmail({ to: adminEmail, subject, text, html });
};

export const sendNewsletterUserThankYou = async (email: string) => {
    const subject = 'Thank you for subscribing to Zoll & Metér';
    const text = `Thank you for subscribing to our newsletter. We'll keep you updated with our latest collections and offers.`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #000;">Welcome to our Newsletter</h1>
            <p>Thank you for subscribing to Zoll & Metér updates.</p>
            <p>You'll be the first to know about our:</p>
            <ul>
                <li>New Collection Launches</li>
                <li>Exclusive Offers</li>
                <li>Style Guides</li>
            </ul>
            <div style="margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Visit Store</a>
            </div>
            <p>Best Regards,<br>The Zoll & Metér Team</p>
        </div>
    `;

    return sendEmail({ to: email, subject, text, html });
};

export const sendBroadcastEmail = async (emails: string[], subject: string, message: string) => {
    try {
        // Send emails in batches to avoid overwhelming the SMTP server
        const batchSize = 50;
        const results = [];

        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);

            // Send to each email in the batch
            const batchPromises = batch.map(email => {
                const html = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                        <div style="padding: 20px; border-bottom: 2px solid #000;">
                            <h1 style="color: #000; margin: 0;">Zoll & Metér</h1>
                        </div>
                        <div style="padding: 30px 20px;">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        <div style="padding: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                            <p>You're receiving this email because you subscribed to our newsletter.</p>
                            <p>Zoll & Metér | ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}</p>
                        </div>
                    </div>
                `;

                return sendEmail({
                    to: email,
                    subject,
                    text: message,
                    html,
                });
            });

            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);

            // Add a small delay between batches to avoid rate limiting
            if (i + batchSize < emails.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`Broadcast sent: ${successful} successful, ${failed} failed out of ${emails.length} total`);

        return {
            success: true,
            total: emails.length,
            successful,
            failed,
        };
    } catch (error) {
        console.error('Error sending broadcast email:', error);
        return { success: false, error };
    }
};

export const sendOrderShippedEmail = async (orderDetails: any, trackingId?: string) => {
    const { shippingInfo, orderId, items } = orderDetails;
    const subject = `Your Order #${orderId} Has Been Shipped!`;
    
    const trackingInfo = trackingId 
        ? `<p><strong>Tracking ID:</strong> ${trackingId}</p>`
        : '<p>You will receive tracking information shortly.</p>';
    
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="padding: 20px; border-bottom: 2px solid #000;">
                <h1 style="color: #000; margin: 0;">Zoll & Metér</h1>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #000;">Your Order Has Been Shipped!</h2>
                <p>Dear ${shippingInfo.firstName},</p>
                <p>Great news! Your order #${orderId} has been shipped and is on its way to you.</p>
                ${trackingInfo}
                <p>Your order will be delivered to:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>${shippingInfo.firstName} ${shippingInfo.lastName}</strong></p>
                    <p style="margin: 5px 0;">${shippingInfo.address}</p>
                    <p style="margin: 5px 0;">${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}</p>
                    <p style="margin: 5px 0;">${shippingInfo.country}</p>
                </div>
            </div>
            <div style="padding: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                <p>Thank you for shopping with Zoll & Metér</p>
            </div>
        </div>
    `;
    
    return sendEmail({
        to: shippingInfo.email,
        subject,
        text: `Your order #${orderId} has been shipped!`,
        html,
    });
};

export const sendTrackingAvailableEmail = async (orderDetails: any, trackingId: string, carrier?: string) => {
    const { shippingInfo, orderId } = orderDetails;
    const subject = `Track Your Order #${orderId}`;
    
    const carrierInfo = carrier ? `<p><strong>Carrier:</strong> ${carrier}</p>` : '';
    
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="padding: 20px; border-bottom: 2px solid #000;">
                <h1 style="color: #000; margin: 0;">Zoll & Metér</h1>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #000;">Tracking Information Available</h2>
                <p>Dear ${shippingInfo.firstName},</p>
                <p>Your order #${orderId} is now trackable!</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Tracking ID:</strong> ${trackingId}</p>
                    ${carrierInfo}
                </div>
                <p>You can use this tracking number to monitor your shipment's progress.</p>
            </div>
            <div style="padding: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                <p>Thank you for shopping with Zoll & Metér</p>
            </div>
        </div>
    `;
    
    return sendEmail({
        to: shippingInfo.email,
        subject,
        text: `Track your order #${orderId} with tracking ID: ${trackingId}`,
        html,
    });
};

export const sendOrderDeliveredEmail = async (orderDetails: any) => {
    const { shippingInfo, orderId } = orderDetails;
    const subject = `Your Order #${orderId} Has Been Delivered`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <div style="padding: 20px; border-bottom: 2px solid #000;">
                <h1 style="color: #000; margin: 0;">Zoll & Metér</h1>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #000;">Order Delivered!</h2>
                <p>Dear ${shippingInfo.firstName},</p>
                <p>Your order #${orderId} has been successfully delivered!</p>
                <p>We hope you love your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>
                <div style="margin: 30px 0;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Shop Again</a>
                </div>
            </div>
            <div style="padding: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
                <p>Thank you for shopping with Zoll & Metér</p>
            </div>
        </div>
    `;
    
    return sendEmail({
        to: shippingInfo.email,
        subject,
        text: `Your order #${orderId} has been delivered!`,
        html,
    });
};
