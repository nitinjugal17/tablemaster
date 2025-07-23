
// src/app/actions/booking-actions.ts
'use server';

import { sendEmail } from '@/lib/emailService';
import type { Booking, OrderItem, CurrencyCode, CurrencySymbol, RestaurantTable, Room, BookingStatus } from '@/lib/types';
import { defaultInvoiceSetupSettings } from '@/lib/types'; 
import { getNotificationSettings, getConversionRates, getBookings, saveBookings as saveAllBookings, getRestaurantTables, getGeneralSettings, getRooms } from './data-management-actions';
import { BASE_CURRENCY_CODE } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';

async function convertPriceForEmail(priceInBase: number, displayCurrencyCode: CurrencyCode, displayCurrencySymbol: string): Promise<string> {
  if (BASE_CURRENCY_CODE === displayCurrencyCode) {
    return `${displayCurrencySymbol}${priceInBase.toFixed(2)}`;
  }
  const conversionRates = await getConversionRates();
  const rate = conversionRates[BASE_CURRENCY_CODE]?.[displayCurrencyCode];
  
  if (rate) {
    return `${displayCurrencySymbol}${(priceInBase * rate).toFixed(2)}`;
  }
  const baseSymbol = displayCurrencyCode === BASE_CURRENCY_CODE ? displayCurrencySymbol : (await getConversionRates())[BASE_CURRENCY_CODE]?.[BASE_CURRENCY_CODE] === 1 ? displayCurrencySymbol : '₹';
  return `${baseSymbol}${priceInBase.toFixed(2)}`;
};


async function generateBookingConfirmationHtml(
    booking: Booking, 
    displayCurrencyCode: CurrencyCode, 
    displayCurrencySymbol: string,
    requestedResource?: RestaurantTable | Room
): Promise<string> {
  let itemsHtml = '';
  let preOrderTotalInBase = 0;
  const generalSettings = await getGeneralSettings(); 

  const orderItemsArray: OrderItem[] = Array.isArray(booking.items) 
    ? booking.items 
    : typeof booking.items === 'string' && booking.items.startsWith('[')
    ? JSON.parse(booking.items) 
    : [];

  if (orderItemsArray.length > 0) {
    itemsHtml += '<h3>Pre-ordered Items:</h3><ul>';
    for (const item of orderItemsArray) {
      const itemPriceFormatted = await convertPriceForEmail(item.price, displayCurrencyCode, displayCurrencySymbol);
      const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                              ? `${item.name} (${item.selectedPortion})` 
                              : item.name;
      itemsHtml += `<li>${itemDisplayName} (x${item.quantity})${item.note ? ` <em style="font-size:0.9em; color:#555;">(${item.note})</em>` : ''} - ${itemPriceFormatted}</li>`;
      preOrderTotalInBase += item.price * item.quantity;
    }
    itemsHtml += '</ul>';
    const preOrderTotalFormatted = await convertPriceForEmail(preOrderTotalInBase, displayCurrencyCode, displayCurrencySymbol);
    itemsHtml += `<p style="font-size: 1.1em; font-weight: bold;"><strong>Pre-order Total: ${preOrderTotalFormatted}</strong></p>`;
  }

  const formattedBookingDate = booking.date && isValid(parseISO(booking.date)) ? format(parseISO(booking.date), "EEEE, MMMM d, yyyy") : 'N/A';
  let requestedResourceHtml = '';
  if (requestedResource) {
    const resourceType = booking.bookingType === 'room' ? 'Room' : 'Table';
    requestedResourceHtml = `<p><strong>Requested ${resourceType}:</strong> ${requestedResource.name} (Capacity: ${requestedResource.capacity})</p>`;
  }


  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Your Booking Request from ${generalSettings.companyName || defaultInvoiceSetupSettings.companyName}!</h2>
      <p>Hi ${booking.customerName},</p>
      <p>Thank you for your booking request for a ${booking.bookingType}! Here are the details:</p>
      <p><strong>Booking ID:</strong> #${String(booking.id).substring(0,8)}</p>
      ${booking.userId ? `<p><strong>User ID (for reference):</strong> ${booking.userId}</p>` : ''}
      <p><strong>Date:</strong> ${formattedBookingDate}</p>
      <p><strong>Time:</strong> ${booking.time}</p>
      <p><strong>Party Size:</strong> ${booking.partySize}</p>
      ${requestedResourceHtml}
      <p><strong>Status:</strong> ${booking.status.toUpperCase()}</p>
      
      ${itemsHtml}
      
      <p>We will confirm your booking shortly. If you need to make any changes, please contact us directly.</p>
      <p>Thanks,</p>
      <p>The ${generalSettings.companyName || defaultInvoiceSetupSettings.companyName} Team</p>
    </div>
  `;
}

export async function sendBookingConfirmationEmail(
  booking: Booking,
  displayCurrencyCode: CurrencyCode, 
  displayCurrencySymbol: string 
): Promise<{ success: boolean; message: string; messageId?: string }> {
  if (!booking.email) {
    return { success: false, message: "No email address provided for booking confirmation." };
  }

  const notificationSettings = await getNotificationSettings();
  if (!notificationSettings.user.emailOnBookingConfirmation) {
    return { success: true, message: "Customer booking confirmation email disabled by settings." };
  }

  let requestedResourceDetails: RestaurantTable | Room | undefined = undefined;
  if (booking.requestedResourceId) {
    if (booking.bookingType === 'room') {
        const rooms = await getRooms();
        requestedResourceDetails = rooms.find(r => r.id === booking.requestedResourceId);
    } else {
        const tables = await getRestaurantTables();
        requestedResourceDetails = tables.find(t => t.id === booking.requestedResourceId);
    }
  }
  const generalSettings = await getGeneralSettings();
  const htmlContent = await generateBookingConfirmationHtml(booking, displayCurrencyCode, displayCurrencySymbol, requestedResourceDetails);
  const subject = `Booking Request #${String(booking.id).substring(0,8)} Received - ${generalSettings.companyName || defaultInvoiceSetupSettings.companyName}`;

  return sendEmail({
    to: booking.email,
    subject,
    html: htmlContent,
  });
}

async function generateNewBookingAdminNotificationHtml(booking: Booking, companyName: string): Promise<string> {
  const formattedBookingDate = booking.date && isValid(parseISO(booking.date)) ? format(parseISO(booking.date), "EEEE, MMMM d, yyyy") : 'N/A';
  let itemsSummary = 'No pre-ordered items.';
  const orderItemsArray: OrderItem[] = Array.isArray(booking.items) ? booking.items : (typeof booking.items === 'string' && booking.items.startsWith('[') ? JSON.parse(booking.items) : []);

  if (orderItemsArray.length > 0) {
    itemsSummary = `${orderItemsArray.reduce((sum, item) => sum + item.quantity, 0)} item(s) pre-ordered. Details: `;
    itemsSummary += orderItemsArray.map(item => {
        const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                                ? `${item.name} (${item.selectedPortion})` 
                                : item.name;
        return `${itemDisplayName} x${item.quantity}`;
    }).join(', ');
  }

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New ${booking.bookingType.charAt(0).toUpperCase() + booking.bookingType.slice(1)} Booking Request at ${companyName}!</h2>
      <p>A new booking request has been received:</p>
      <ul>
        <li><strong>Booking ID:</strong> #${String(booking.id).substring(0,8)}</li>
        ${booking.userId ? `<li><strong>User ID:</strong> ${booking.userId}</li>` : ''}
        <li><strong>Customer:</strong> ${booking.customerName}</li>
        <li><strong>Contact:</strong> ${booking.phone}${booking.email ? ` / ${booking.email}` : ''}</li>
        <li><strong>Date & Time:</strong> ${formattedBookingDate} at ${booking.time}</li>
        <li><strong>Party Size:</strong> ${booking.partySize}</li>
        <li><strong>Status:</strong> ${booking.status.toUpperCase()}</li>
        ${booking.requestedResourceId ? `<li><strong>Requested Resource ID:</strong> ${booking.requestedResourceId}</li>` : ''}
        <li><strong>Pre-order:</strong> ${itemsSummary}</li>
        ${booking.notes ? `<li><strong>Notes:</strong> ${booking.notes}</li>` : ''}
      </ul>
      <p>Please review and confirm this booking in the admin panel.</p>
    </div>
  `;
}


export async function saveNewBooking(bookingData: Omit<Booking, 'createdAt'> & { createdAt?: string }): Promise<{
  success: boolean;
  message: string;
  bookingId?: string;
  customerEmailStatus: { sent: boolean; error?: string; messageId?: string };
  adminEmailStatus: { sent: boolean; error?: string; messageId?: string };
}> {
  type EmailStatus = { sent: boolean; error?: string; messageId?: string };
  
  let customerEmailResult: EmailStatus = { sent: false, error: "Email not attempted or not applicable." };
  let adminEmailResult: EmailStatus = { sent: false, error: "Email not attempted or not applicable." };
  
  try {
    const generalSettings = await getGeneralSettings();
    // Force server-side timestamp for createdAt
    const { createdAt, ...restOfBookingData } = bookingData;
    
    // Check for auto-approval
    const autoApprove = (restOfBookingData.bookingType === 'room' && generalSettings.autoApproveRoomBookings) || 
                        (restOfBookingData.bookingType === 'table' && generalSettings.autoApproveTableBookings);
    
    const finalBooking: Booking = { 
        ...restOfBookingData, 
        status: autoApprove ? 'confirmed' : 'pending',
        createdAt: new Date().toISOString() // Always set createdAt to current time on the server
    };

    const currentBookings = await getBookings();
    const updatedBookings = [...currentBookings, finalBooking];
    const saveResult = await saveAllBookings(updatedBookings);

    if (!saveResult.success) {
      return {
        success: false,
        message: `Failed to save booking: ${saveResult.message}`,
        customerEmailStatus: { sent: false, error: saveResult.message },
        adminEmailStatus: { sent: false, error: saveResult.message },
      };
    }
    
    if (finalBooking.email) {
      const emailRes = await sendBookingConfirmationEmail(finalBooking, generalSettings.currencyCode, generalSettings.currencySymbol);
      customerEmailResult = { sent: emailRes.success, error: emailRes.success ? undefined : emailRes.message, messageId: emailRes.messageId };
    } else {
      customerEmailResult = { sent: false, error: "No customer email provided for booking." };
    }

    const notificationSettings = await getNotificationSettings();
    const adminRecipientEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS || generalSettings.footerContactEmail || process.env.EMAIL_FROM;
    
    if (notificationSettings.admin.notifyOnNewBooking && adminRecipientEmail) {
        const adminHtmlContent = await generateNewBookingAdminNotificationHtml(finalBooking, generalSettings.companyName || "Your Restaurant");
        const adminRes = await sendEmail({
          to: adminRecipientEmail,
          subject: `New ${finalBooking.bookingType} Booking: #${String(finalBooking.id).substring(0,8)} - ${finalBooking.customerName}`,
          html: adminHtmlContent,
        });
        adminEmailResult = { sent: adminRes.success, error: adminRes.success ? undefined : adminRes.message, messageId: adminRes.messageId };
    } else {
        adminEmailResult = { sent: false, error: "Admin new booking notification disabled or admin email not configured." };
    }

    return {
      success: true,
      message: `Booking #${String(finalBooking.id).substring(0,8)} saved successfully with status '${finalBooking.status}'.`,
      bookingId: finalBooking.id,
      customerEmailStatus: customerEmailResult,
      adminEmailStatus: adminEmailResult,
    };

  } catch (error) {
    console.error("Error saving new booking:", error);
    return {
      success: false,
      message: `An unexpected error occurred while saving booking: ${(error as Error).message}`,
      customerEmailStatus: { sent: false, error: (error as Error).message },
      adminEmailStatus: { sent: false, error: (error as Error).message },
    };
  }
}

async function generateBookingStatusUpdateHtml(
    booking: Booking, 
    newStatus: BookingStatus | null, // Can be null if only time changed
    newDate: string | null,
    newTime: string | null,
    assignedResource?: RestaurantTable | Room, 
    adminNote?: string
): Promise<string> {
  const generalSettings = await getGeneralSettings();
  const resourceType = booking.bookingType === 'room' ? 'Room' : 'Table';
  let message = '';
  
  if (newStatus && newStatus !== booking.status) {
      switch(newStatus) {
        case 'confirmed': message += `Your booking has been CONFIRMED. `; break;
        case 'cancelled': message += `We regret to inform you that your booking has been CANCELLED. `; break;
        default: message += `Your booking status has been updated to ${newStatus.toUpperCase()}. `;
      }
  } else if (newDate || newTime) {
      message += `Your booking details have been updated. `;
  }

  const formattedNewDate = newDate ? format(parseISO(newDate), "EEEE, MMMM d, yyyy") : null;
  const newDetailsHtml = `
      <p><strong>Date:</strong> ${formattedNewDate || format(parseISO(booking.date), "EEEE, MMMM d, yyyy")}</p>
      <p><strong>Time:</strong> ${newTime || booking.time}</p>
  `;

  let adminNoteHtml = '';
  if (adminNote) {
    adminNoteHtml = `<div style="margin-top: 15px; padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; border-radius: 4px;">
      <p style="margin: 0;"><strong>A note from our team:</strong><br/>${adminNote.replace(/\n/g, '<br/>')}</p>
    </div>`;
  }
  
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Booking Update - ${generalSettings.companyName || defaultInvoiceSetupSettings.companyName}</h2>
      <p>Hi ${booking.customerName},</p>
      <p>${message}</p>
      <div style="background-color:#f8f8f8; padding:15px; border-radius:5px; margin: 15px 0;">
        <h3 style="margin-top:0;">Updated Details:</h3>
        ${newDetailsHtml}
      </div>
      ${adminNoteHtml}
      <p>If you have any questions, please contact us.</p>
      <p>Thanks,</p>
      <p>The ${generalSettings.companyName || defaultInvoiceSetupSettings.companyName} Team</p>
    </div>
  `;
}


export async function sendBookingStatusUpdateEmail(
  booking: Booking,
  newStatus: BookingStatus | null,
  newDate: string | null,
  newTime: string | null,
  assignedResource?: RestaurantTable | Room,
  adminNote?: string,
): Promise<{ success: boolean; message: string; messageId?: string }> {
  if (!booking.email) {
    return { success: false, message: "No email address provided for booking status update." };
  }

  const notificationSettings = await getNotificationSettings();
  if (!notificationSettings.user.emailOnBookingStatusUpdate) {
    return { success: true, message: "Customer booking status update email disabled by settings." };
  }

  const htmlContent = await generateBookingStatusUpdateHtml(booking, newStatus, newDate, newTime, assignedResource, adminNote);
  const subject = `Booking Update for #${String(booking.id).substring(0,8)}`;

  return sendEmail({
    to: booking.email,
    subject,
    html: htmlContent,
  });
}


export async function updateBookingDetails(
  bookingId: string, 
  updates: Partial<Booking> & { adminNote?: string }
): Promise<{ success: boolean; message: string; updatedBooking?: Booking }> {
  console.log(`[Booking Action] Attempting to update booking ${bookingId} with updates:`, JSON.stringify(updates));
  try {
    const currentBookings = await getBookings();
    const bookingIndex = currentBookings.findIndex(b => b.id === bookingId);

    if (bookingIndex === -1) {
      return { success: false, message: `Booking #${bookingId} not found.` };
    }

    const originalBooking = { ...currentBookings[bookingIndex] };
    const { adminNote, ...otherUpdates } = updates;
    
    // Spread updates over original to apply changes
    const updatedBookingData: Booking = { 
        ...originalBooking, 
        ...otherUpdates,
    };

    if (adminNote) {
      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm");
      const formattedNote = `[${timestamp}] Admin Note: ${adminNote}`;
      updatedBookingData.notes = originalBooking.notes 
          ? `${originalBooking.notes}\n---\n${formattedNote}`
          : formattedNote;
    }

    currentBookings[bookingIndex] = updatedBookingData;

    const saveResult = await saveAllBookings(currentBookings);

    if (saveResult.success) {
      console.log(`[Booking Action] Successfully updated booking ${bookingId}.`);
      
      const statusChanged = updates.status && updates.status !== originalBooking.status;
      const dateChanged = updates.date && updates.date !== originalBooking.date;
      const timeChanged = updates.time && updates.time !== originalBooking.time;

      if ((statusChanged || dateChanged || timeChanged) && updatedBookingData.email) {
         let assignedResourceDetails: RestaurantTable | Room | undefined = undefined;
         if (updatedBookingData.assignedResourceId) {
            if (updatedBookingData.bookingType === 'room') {
                const rooms = await getRooms();
                assignedResourceDetails = rooms.find(r => r.id === updatedBookingData.assignedResourceId);
            } else {
                const tables = await getRestaurantTables();
                assignedResourceDetails = tables.find(t => t.id === updatedBookingData.assignedResourceId);
            }
         }
         // Send email with new and old status/date/time for context
         sendBookingStatusUpdateEmail(
            updatedBookingData, 
            statusChanged ? updates.status! : null,
            dateChanged ? updates.date! : null,
            timeChanged ? updates.time! : null,
            assignedResourceDetails, 
            adminNote
         ).then(emailResult => {
            if (!emailResult.success) console.warn(`[Booking Action] Failed to send status update email for booking ${bookingId}: ${emailResult.message}`);
         }).catch(emailError => {
            console.error(`[Booking Action] Error sending status update email for booking ${bookingId}:`, emailError);
         });
      }
      return { success: true, message: `Booking #${String(bookingId).substring(0,8)} updated successfully.`, updatedBooking: updatedBookingData };
    } else {
      return { success: false, message: `Failed to save updated bookings: ${saveResult.message}` };
    }
  } catch (error) {
    console.error(`Error updating booking ${bookingId}:`, error);
    return { success: false, message: `An unexpected error occurred while updating booking: ${(error as Error).message}` };
  }
}

export async function deleteBooking(bookingId: string): Promise<{success: boolean, message: string}> {
    console.log(`[Booking Action] Attempting to delete booking ${bookingId}`);
    try {
        let currentBookings = await getBookings();
        const bookingsCountBefore = currentBookings.length;
        const updatedBookings = currentBookings.filter(b => b.id !== bookingId);

        if (updatedBookings.length === bookingsCountBefore) {
            return { success: false, message: `Booking #${bookingId} not found.` };
        }

        const saveResult = await saveAllBookings(updatedBookings);
        if (saveResult.success) {
            return { success: true, message: `Booking #${String(bookingId).substring(0,8)} deleted successfully.` };
        } else {
            return { success: false, message: `Failed to save after deleting booking: ${saveResult.message}` };
        }
    } catch (error) {
        console.error(`Error deleting booking ${bookingId}:`, error);
        return { success: false, message: `An unexpected error occurred: ${(error as Error).message}` };
    }
}
