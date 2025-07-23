// src/app/actions/contact-actions.ts
'use server';

import { sendEmail } from '@/lib/emailService';
import { getGeneralSettings } from './data-management-actions';

interface ContactFormData {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export async function sendContactFormEmail(formData: ContactFormData): Promise<{ success: boolean; message: string }> {
  try {
    const generalSettings = await getGeneralSettings();
    
    const adminRecipientEmail = generalSettings.footerContactEmail || process.env.EMAIL_FROM;

    if (!adminRecipientEmail) {
      console.error("[Contact Action] Admin recipient email not configured in General Settings (footerContactEmail) or .env (EMAIL_FROM).");
      return { success: false, message: "Admin contact email is not configured. Please try again later." };
    }
    
    const emailSubject = formData.subject 
      ? `Contact Form: ${formData.subject} - From ${formData.name}`
      : `New Contact Form Submission from ${formData.name}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Contact Form Submission</h2>
        <p>You have received a new message through the TableMaster contact form:</p>
        <hr>
        <p><strong>Name:</strong> ${formData.name}</p>
        <p><strong>Email:</strong> <a href="mailto:${formData.email}">${formData.email}</a></p>
        ${formData.subject ? `<p><strong>Subject:</strong> ${formData.subject}</p>` : ''}
        <p><strong>Message:</strong></p>
        <div style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9; border-radius: 4px;">
          <p style="white-space: pre-wrap;">${formData.message}</p>
        </div>
        <hr>
        <p style="font-size: 0.9em; color: #777;">This message was sent from the contact form on your TableMaster website.</p>
      </div>
    `;

    const result = await sendEmail({
      to: adminRecipientEmail, // Send to admin
      replyTo: formData.email, // Set Reply-To for easy response
      subject: emailSubject,
      html: htmlContent,
    });

    if (result.success) {
      return { success: true, message: "Message sent successfully!" };
    } else {
      return { success: false, message: `Failed to send message: ${result.message}` };
    }

  } catch (error) {
    console.error("Error in sendContactFormEmail action:", error);
    return { success: false, message: "An unexpected error occurred while trying to send your message." };
  }
}
