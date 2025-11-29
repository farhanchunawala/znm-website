import nodemailer from 'nodemailer';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content?: Buffer | string;
        path?: string;
    }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASS;

        // Check if email is configured
        if (!user || !pass) {
            console.warn('Email not configured. Skipping email send.');
            console.log('Would have sent email to:', options.to);
            console.log('Subject:', options.subject);
            return false;
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        });

        const mailOptions = {
            from: user,
            to: options.to,
            subject: options.subject,
            html: options.html,
            attachments: options.attachments,
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', options.to);
        return true;
    } catch (error) {
        console.error('Failed to send email:', error);
        return false;
    }
}
