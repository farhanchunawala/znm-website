import nodemailer from 'nodemailer';

export async function sendInquiryEmail(data: any) {
  const { name, email, mobileNo, message, product } = data;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('Email credentials not configured; skipping email send.');
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
