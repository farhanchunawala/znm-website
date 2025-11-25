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
  const { orderId, customerId, email, items, total } = data;
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
  const mailOptions = {
    from: user,
    to: 'zollandmeter@gmail.com',
    subject: `New Order ${orderId}`,
    text: `Order ID: ${orderId}\nCustomer ID: ${customerId}\nEmail: ${email}\nItems:\n${itemList}\nTotal: Rs. ${total}`,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Failed to send order email:', err);
  }
}
