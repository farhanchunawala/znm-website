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
