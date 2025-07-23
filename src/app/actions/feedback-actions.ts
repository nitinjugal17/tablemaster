// src/app/actions/feedback-actions.ts
'use server';
import { getFeedback, saveFeedback, getNotificationSettings, getGeneralSettings } from './data-management-actions';
import { sendEmail } from '@/lib/emailService';
import type { Feedback } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export async function submitFeedback(feedbackData: Omit<Feedback, 'id' | 'createdAt'>): Promise<{ success: boolean, message: string }> {
  const newFeedback: Feedback = {
    ...feedbackData,
    id: `fbk-${crypto.randomUUID().substring(0, 8)}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const allFeedback = await getFeedback();
    allFeedback.push(newFeedback);
    const saveResult = await saveFeedback(allFeedback);
    if (!saveResult.success) {
      throw new Error(saveResult.message);
    }
    
    // Admin notification
    const notificationSettings = await getNotificationSettings();
    if (notificationSettings.admin.notifyOnNewFeedback) {
        const generalSettings = await getGeneralSettings();
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS || generalSettings.footerContactEmail;
        if (adminEmail) {
            const subject = `New Feedback Received (${newFeedback.rating}/5) - ${newFeedback.category}`;
            const htmlContent = `
                <h2>New Customer Feedback</h2>
                <p><strong>Rating:</strong> ${'★'.repeat(newFeedback.rating)}${'☆'.repeat(5 - newFeedback.rating)} (${newFeedback.rating}/5)</p>
                <p><strong>Category:</strong> ${newFeedback.category}</p>
                <p><strong>Comments:</strong></p>
                <p>${newFeedback.comments}</p>
                <hr>
                <p><strong>Customer:</strong> ${newFeedback.customerName || 'Anonymous'}</p>
                <p><strong>Contact:</strong> ${newFeedback.contactInfo || 'Not provided'}</p>
                <p><strong>Submitted On:</strong> ${format(parseISO(newFeedback.createdAt), 'MMM d, yyyy h:mm a')}</p>
            `;
            await sendEmail({ to: adminEmail, subject, html: htmlContent });
        }
    }
    
    return { success: true, message: 'Thank you for your valuable feedback!' };
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return { success: false, message: 'There was an error submitting your feedback. Please try again.' };
  }
}
