
'use server';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, text, html, replyTo }: MailOptions): Promise<{success: boolean, message: string, messageId?: string}> {
  
  const isSmtpConfigured = !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS && !!process.env.EMAIL_FROM;

  if (!isSmtpConfigured) {
    const errorMessage = "Email server (SMTP) is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in the .env file.";
    console.warn(`[Email Service] ${errorMessage}`);
    
    // In development, mock a successful response for testing UI flows
    if (process.env.NODE_ENV !== 'production') {
        console.log(`\n--- MOCK EMAIL (SMTP Not Configured) ---`);
        console.log(`To: ${to}`);
        console.log(`From: (would be ${process.env.EMAIL_FROM || 'not-set@example.com'})`);
        console.log(`Reply-To: ${replyTo || 'N/A'}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body (HTML): ${html.substring(0, 250).replace(/<[^>]*>/g, ' ')}...`);
        console.log(`--------------------------------------\n`);
        return { success: true, message: `Email would be sent, but SMTP is not configured. (Mocked for dev).`, messageId: "mock_message_id" };
    }
    // In production, this is a hard failure.
    return { success: false, message: errorMessage };
  }

  // Create transporter inside the function to ensure env vars are loaded.
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: (process.env.SMTP_PORT || "587") === "465", // Use true for 465, false for other ports.
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'true'
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
    replyTo,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[Email Service] Message sent successfully: %s', info.messageId);
    return { success: true, message: "Email sent successfully", messageId: info.messageId };
  } catch (error) {
    const errorMessage = `Failed to send email. Please check server logs for details. Error: ${(error as Error).message}`;
    console.error('[Email Service] Error sending email:', error);
    return { success: false, message: errorMessage };
  }
}
