import nodemailer from 'nodemailer';

/**
 * Send an email for a product inquiry.
 */
export async function sendInquiryEmail(data: any) {
  const { name, email, mobileNo, message, product } = data;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    console.warn('Email credentials not configured; skipping inquiry email send.');
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  const mailOptions = {
    from: user,
    to: 'zollandmeter@gmail.com',
    subject: `New product inquiry for ${product}`,
    text: `You have received a new inquiry:\n\nName: ${name}\nEmail: ${email}\nPhone: ${mobileNo}\nProduct: ${product}\nMessage: ${message}`,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Failed to send inquiry email:', err);
  }
}

/**
 * Send an email for a new order.
 */
export async function sendOrderEmail(data: any) {
  const { orderId, customerId, email, items, total, shippingInfo } = data;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    console.warn('Email credentials not configured; skipping order email send.');
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  const itemList = items
    .map((it: any) => `- ${it.title} x${it.quantity} (${it.size})`)
    .join('\n');

  const shippingAddress = shippingInfo ? `
Shipping Address:
${shippingInfo.firstName} ${shippingInfo.lastName}
${shippingInfo.address}
${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}
${shippingInfo.country || 'N/A'}
Phone: ${shippingInfo.phoneCode || ''}${shippingInfo.phone}` : '';

  const mailOptions = {
    from: user,
    to: 'zollandmeter@gmail.com',
    subject: `New Order ${orderId}`,
    text: `Order ID: ${orderId}
Customer ID: ${customerId}
Email: ${email}
${shippingAddress}

Items:
${itemList}

Total: Rs. ${total}`,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Failed to send order email:', err);
  }
}

/**
 * Send a thank you email to the customer after order placement.
 */
export async function sendCustomerThankYouEmail(data: any) {
  const { orderId, customerId, email, items, total, shippingInfo } = data;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    console.warn('Email credentials not configured; skipping customer thank you email.');
    return;
  }
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  // Format items for display
  const itemsHtml = items
    .map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.size}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${item.price}</td>
      </tr>
    `)
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Your Order</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #000000; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 300;">Thank You for Your Order!</h1>
            </td>
          </tr>

          <!-- Order Confirmation Message -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Dear ${shippingInfo.firstName} ${shippingInfo.lastName},
              </p>
              <p style="font-size: 16px; color: #333; margin: 0 0 20px 0;">
                Thank you for your order! We're excited to process your purchase and get it to you as soon as possible.
              </p>
            </td>
          </tr>

          <!-- Order Details -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h2 style="font-size: 20px; color: #333; margin: 0 0 15px 0; border-bottom: 2px solid #000; padding-bottom: 10px;">Order Details</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 5px 0; color: #666;">Order ID:</td>
                  <td style="padding: 5px 0; color: #333; font-weight: bold; text-align: right;">${orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Customer ID:</td>
                  <td style="padding: 5px 0; color: #333; font-weight: bold; text-align: right;">${customerId}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Order Date:</td>
                  <td style="padding: 5px 0; color: #333; text-align: right;">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Ordered -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h2 style="font-size: 20px; color: #333; margin: 0 0 15px 0; border-bottom: 2px solid #000; padding-bottom: 10px;">Items Ordered</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eee;">
                <thead>
                  <tr style="background-color: #f9f9f9;">
                    <th style="padding: 10px; text-align: left; color: #666; font-weight: 600;">Product</th>
                    <th style="padding: 10px; text-align: center; color: #666; font-weight: 600;">Size</th>
                    <th style="padding: 10px; text-align: center; color: #666; font-weight: 600;">Qty</th>
                    <th style="padding: 10px; text-align: right; color: #666; font-weight: 600;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr>
                    <td colspan="3" style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 18px;">Total:</td>
                    <td style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 18px; color: #000;">Rs. ${total}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Shipping Address -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h2 style="font-size: 20px; color: #333; margin: 0 0 15px 0; border-bottom: 2px solid #000; padding-bottom: 10px;">Shipping Address</h2>
              <p style="margin: 0; color: #333; line-height: 1.6;">
                ${shippingInfo.firstName} ${shippingInfo.lastName}<br>
                ${shippingInfo.address}<br>
                ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}<br>
                ${shippingInfo.country || 'India'}<br>
                Phone: ${shippingInfo.phoneCode || ''}${shippingInfo.phone}<br>
                Email: ${email}
              </p>
            </td>
          </tr>

          <!-- Company Information -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h2 style="font-size: 20px; color: #333; margin: 0 0 15px 0; border-bottom: 2px solid #000; padding-bottom: 10px;">Contact Us</h2>
              <p style="margin: 0 0 10px 0; color: #333; line-height: 1.6;">
                <strong>Zoll & Meter</strong><br>
                Shop no. 10, Abba Apartment<br>
                Jogeshwari West, Mumbai - 400102<br>
                Phone: +91 7718819099<br>
                Email: zollandmeter@gmail.com
              </p>
              <div style="margin-top: 20px;">
                <a href="https://wa.me/919769735377?text=Hi" style="display: inline-block; margin: 5px 10px 5px 0; padding: 10px 20px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: 600;">WhatsApp</a>
                <a href="https://www.instagram.com/zollandmeter/?ref=app" style="display: inline-block; margin: 5px 10px 5px 0; padding: 10px 20px; background-color: #E4405F; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: 600;">Instagram</a>
              </div>
            </td>
          </tr>

          <!-- Quick Links -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <h2 style="font-size: 20px; color: #333; margin: 0 0 15px 0; border-bottom: 2px solid #000; padding-bottom: 10px;">Quick Links</h2>
              <p style="margin: 0; line-height: 2;">
                <a href="http://localhost:3000" style="color: #000; text-decoration: none; font-weight: 600;">🏠 Visit Our Website</a><br>
                <a href="http://localhost:3000/newsletter" style="color: #000; text-decoration: none; font-weight: 600;">📧 Subscribe to Newsletter</a><br>
                <a href="http://localhost:3000/offers" style="color: #000; text-decoration: none; font-weight: 600;">🎁 View Special Offers</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                Thank you for shopping with Zoll & Meter!
              </p>
              <p style="margin: 0; color: #999; font-size: 12px;">
                If you have any questions about your order, please contact us at zollandmeter@gmail.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const mailOptions = {
    from: user,
    to: email,
    subject: `Thank You for Your Order ${orderId} - Zoll & Meter`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Thank you email sent to customer: ${email}`);
  } catch (err) {
    console.error('Failed to send customer thank you email:', err);
  }
}
