// src/app/actions/email-tester-actions.ts
'use server';

import { sendEmail } from '@/lib/emailService';

interface TestEmailPayload {
  recipientEmail: string;
  subject: string;
  body: string;
}

interface TestEmailResult {
  success: boolean;
  message: string;
  details: {
    to: string;
    subject: string;
    messageId?: string;
    error?: string;
  };
}

/**
 * A server action specifically for sending a test email from the admin panel.
 * It provides more detailed feedback than other email functions for debugging.
 * @param payload - The recipient, subject, and body for the test email.
 * @returns A detailed result object.
 */
export async function sendTestEmailAction(payload: TestEmailPayload): Promise<TestEmailResult> {
  const { recipientEmail, subject, body } = payload;
  
  try {
    const result = await sendEmail({
      to: recipientEmail,
      subject: subject,
      html: `<p>${body}</p><br><p>This is a test email sent from the TableMaster application's Email Tester tool.</p>`,
      text: `${body}\n\nThis is a test email sent from the TableMaster application's Email Tester tool.`,
    });

    if (result.success) {
      return {
        success: true,
        message: 'Test email command sent successfully.',
        details: {
          to: recipientEmail,
          subject: subject,
          messageId: result.messageId,
          error: result.message, // Include message even on success (e.g., from mocks)
        },
      };
    } else {
      return {
        success: false,
        message: 'The email server failed to send the email.',
        details: {
          to: recipientEmail,
          subject: subject,
          error: result.message,
        },
      };
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error('[Email Tester Action] A critical error occurred:', error);
    return {
      success: false,
      message: 'A critical server error occurred while trying to send the email.',
      details: {
        to: recipientEmail,
        subject: subject,
        error: errorMessage,
      },
    };
  }
}
