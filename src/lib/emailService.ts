
'use server';
import nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
  replyTo?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, text, html, replyTo }: MailOptions): Promise<{success: boolean, message: string, messageId?: string}> {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
    replyTo,
  };

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_FROM) {
    const errorMessage = "Email server (SMTP) is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in the .env file.";
    console.warn(errorMessage);
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`Mock Email (SMTP not configured):\nTo: ${to}\nReply-To: ${replyTo}\nSubject: ${subject}\nBody: ${html.substring(0,200)}...`);
        return { success: true, message: `Email sent (mocked - ${errorMessage})`, messageId: "mock_message_id" };
    }
    return { success: false, message: errorMessage };
  }


  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return { success: true, message: "Email sent successfully", messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, message: `Failed to send email: ${(error as Error).message}` };
  }
}
