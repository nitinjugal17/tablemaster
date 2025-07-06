// src/app/actions/order-actions.ts
'use server';

import { sendEmail } from '@/lib/emailService';
import type { Order, InvoiceSetupSettings, OrderItem, CurrencyCode, PaymentType, UserRole, Booking, OrderStatus } from '@/lib/types';
import { BASE_CURRENCY_CODE, defaultInvoiceSetupSettings } from '@/lib/types'; 
import { 
    getNotificationSettings, 
    getOrders, 
    saveOrders, 
    getGeneralSettings, 
    getUsers,
    saveUsers,
    getConversionRates,
    getBookings,
    getRoomStock,
    saveRoomStock,
} from './data-management-actions';
import { format, parseISO, isToday } from 'date-fns';

type EmailStatus = { sent: boolean; error?: string; messageId?: string };

async function convertPriceForEmail(priceInBase: number, displayCurrencyCode: CurrencyCode, displayCurrencySymbol: string): Promise<string> {
  if (BASE_CURRENCY_CODE === displayCurrencyCode) {
    return `${displayCurrencySymbol}${priceInBase.toFixed(2)}`;
  }
  const conversionRates = await getConversionRates(); 
  const rate = conversionRates[BASE_CURRENCY_CODE]?.[displayCurrencyCode];
  
  if (rate) {
    return `${displayCurrencySymbol}${(priceInBase * rate).toFixed(2)}`;
  }
  console.warn(`[Order Action] Conversion rate from ${BASE_CURRENCY_CODE} to ${displayCurrencyCode} not found for email. Returning base price with base symbol.`);
  const baseSymbol = displayCurrencyCode === BASE_CURRENCY_CODE ? displayCurrencySymbol : (await getConversionRates())[BASE_CURRENCY_CODE]?.[BASE_CURRENCY_CODE] === 1 ? displayCurrencySymbol : 'ERR';
  return `${baseSymbol}${priceInBase.toFixed(2)}`;
};

async function generateOrderConfirmationHtml(order: Order, displayCurrencyCode: CurrencyCode, displayCurrencySymbol: string): Promise<string> {
  let itemsHtml = '';
  for (const item of order.items) {
    const itemPriceFormatted = await convertPriceForEmail(item.price, displayCurrencyCode, displayCurrencySymbol);
    const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                            ? `${item.name} (${item.selectedPortion})` 
                            : item.name;
    itemsHtml += `<li>${itemDisplayName} (x${item.quantity})${item.note ? ` <em style="font-size:0.9em; color:#555;">(${item.note})</em>` : ''} - ${itemPriceFormatted}</li>`;
  }
  const totalFormatted = await convertPriceForEmail(order.total, displayCurrencyCode, displayCurrencySymbol);
  const formattedDate = order.createdAt ? format(parseISO(order.createdAt), "MMM d, yyyy, h:mm a") : 'N/A';
  const generalSettings = await getGeneralSettings();

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Your Order Confirmation from ${generalSettings.companyName || defaultInvoiceSetupSettings.companyName}!</h2>
      <p>Hi ${order.customerName},</p>
      <p>Thank you for your order! Here are the details:</p>
      <p><strong>Order ID:</strong> #${String(order.id).substring(0,8)}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Order Type:</strong> ${order.orderType}</p>
      ${order.orderType === 'Dine-in' && order.tableNumber ? `<p><strong>Table:</strong> ${order.tableNumber}</p>` : ''}
      ${order.bookingId ? `<p><strong>For Booking ID:</strong> #${String(order.bookingId).substring(0,8)}</p>` : ''}
      
      <h3>Items:</h3>
      <ul>${itemsHtml}</ul>
      <p style="font-size: 1.1em; font-weight: bold;"><strong>Total: ${totalFormatted}</strong></p>
      
      <p>We are now ${order.status === 'Pending' ? 'processing' : order.status.toLowerCase()} your order. We'll notify you of further updates.</p>
      <p>Thanks,</p>
      <p>The ${generalSettings.companyName || defaultInvoiceSetupSettings.companyName} Team</p>
    </div>
  `;
}

export async function sendOrderConfirmationEmailToCustomer(
  order: Order, 
  customerEmail: string,
  displayCurrencyCode: CurrencyCode, 
  displayCurrencySymbol: string 
): Promise<{ success: boolean; message: string; messageId?: string }> {
  const notificationSettings = await getNotificationSettings();
  if (!notificationSettings.user.emailOnOrderConfirmation) {
    return { success: true, message: "Customer order confirmation email disabled by settings." };
  }
  
  const generalSettings = await getGeneralSettings();
  const htmlContent = await generateOrderConfirmationHtml(order, displayCurrencyCode, displayCurrencySymbol);
  const subject = `Order Confirmation #${String(order.id).substring(0,8)} from ${generalSettings.companyName || defaultInvoiceSetupSettings.companyName}`;

  return sendEmail({
    to: customerEmail,
    subject,
    html: htmlContent,
  });
}

async function generateNewOrderAdminNotificationHtml(order: Order, displayCurrencyCode: CurrencyCode, displayCurrencySymbol: string): Promise<string> {
  let itemsHtml = '';
  for (const item of order.items) {
    const itemPriceFormatted = await convertPriceForEmail(item.price, displayCurrencyCode, displayCurrencySymbol); 
    const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                            ? `${item.name} (${item.selectedPortion})` 
                            : item.name;
    itemsHtml += `<li>${itemDisplayName} (x${item.quantity})${item.note ? ` <em style="font-size:0.9em; color:#555;">(${item.note})</em>` : ''} - ${itemPriceFormatted}</li>`;
  }
  const totalFormatted = await convertPriceForEmail(order.total, displayCurrencyCode, displayCurrencySymbol);
  const formattedDate = order.createdAt ? format(parseISO(order.createdAt), "MMM d, yyyy, h:mm a") : 'N/A';
  const generalSettings = await getGeneralSettings();

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New Order Received! (ID: #${String(order.id).substring(0,8)})</h2>
      <p>A new order has been placed at ${generalSettings.companyName || "Your Restaurant"}:</p>
      <p><strong>Customer:</strong> ${order.customerName}</p>
      ${order.userId ? `<p><strong>User ID:</strong> ${order.userId}</p>` : ''}
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Order Type:</strong> ${order.orderType}</p>
      ${order.orderType === 'Dine-in' && order.tableNumber ? `<p><strong>Table:</strong> ${order.tableNumber}</p>` : ''}
      ${order.bookingId ? `<p><strong>For Booking ID:</strong> #${String(order.bookingId).substring(0,8)}</p>` : ''}
      
      <h3>Items:</h3>
      <ul>${itemsHtml}</ul>
      <p style="font-size: 1.1em; font-weight: bold;"><strong>Total: ${totalFormatted}</strong></p>
      
      <p>Status: ${order.status}</p>
      <p>Please check the admin panel to manage this order.</p>
    </div>
  `;
}

export async function sendNewOrderNotificationToAdmin(
  order: Order,
  adminEmail: string
): Promise<{ success: boolean; message: string; messageId?: string }> {
  const notificationSettings = await getNotificationSettings();
  if (!notificationSettings.admin.notifyOnNewOrder) {
    return { success: true, message: "Admin new order notification email disabled by settings." };
  }
  if (!adminEmail) {
    return { success: false, message: "Admin email for notifications is not configured."};
  }
  const generalSettings = await getGeneralSettings();
  const htmlContent = await generateNewOrderAdminNotificationHtml(order, generalSettings.currencyCode, generalSettings.currencySymbol);
  const subject = `New Order Received: #${String(order.id).substring(0,8)}`;

  return sendEmail({
    to: adminEmail,
    subject,
    html: htmlContent,
  });
}

async function generateOrderStatusUpdateEmailHtml(order: Order, newStatus: Order['status'], companyName: string): Promise<string> {
  const formattedDate = order.createdAt ? format(parseISO(order.createdAt), "MMM d, yyyy, h:mm a") : 'N/A';
  let statusMessage = `Your order status has been updated to: <strong>${newStatus.toUpperCase()}</strong>.`;
  if (newStatus === 'Ready for Pickup') {
    statusMessage = `Great news! Your order #${String(order.id).substring(0,8)} is now <strong>READY FOR PICKUP</strong>.`;
  } else if (newStatus === 'Out for Delivery') {
    statusMessage = `Your order #${String(order.id).substring(0,8)} is <strong>OUT FOR DELIVERY</strong> and will arrive soon!`;
  }

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Order Status Update - ${companyName}</h2>
      <p>Hi ${order.customerName},</p>
      <p>${statusMessage}</p>
      <p><strong>Order ID:</strong> #${String(order.id).substring(0,8)}</p>
      <p><strong>Order Date:</strong> ${formattedDate}</p>
      <p>If you have any questions, please contact us.</p>
      <p>Thanks,</p>
      <p>The ${companyName} Team</p>
    </div>
  `;
}

async function generateOrderCompletedEmailHtml(order: Order, companyName: string, pointsAwarded: number): Promise<string> {
  const formattedDate = order.createdAt ? format(parseISO(order.createdAt), "MMM d, yyyy, h:mm a") : 'N/A';
  const generalSettings = await getGeneralSettings();
  
  let pointsMessage = '';
  if (pointsAwarded > 0) {
    pointsMessage = `<p style="padding: 10px; background-color: #e8f5e9; border-left: 4px solid #4CAF50;">You've earned <strong>${pointsAwarded} loyalty points</strong> with this order!</p>`;
  }

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Your Order is Complete! - ${companyName}</h2>
      <p>Hi ${order.customerName},</p>
      <p>Your order #${String(order.id).substring(0,8)} from ${formattedDate} has been completed. We hope you enjoyed your meal!</p>
      ${pointsMessage}
      <p>Thank you for choosing ${companyName}. We look forward to serving you again soon!</p>
      ${generalSettings.footerFacebookUrl || generalSettings.footerInstagramUrl ? '<p>Follow us on social media!</p>' : ''}
      <p>Thanks,</p>
      <p>The ${companyName} Team</p>
    </div>
  `;
}


export async function updateOrderStatus(orderId: string, newStatus: Order['status']): Promise<{ success: boolean; message: string }> {
  try {
    const orders = await getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return { success: false, message: `Order with ID ${orderId} not found.` };
    }
    
    const originalStatus = orders[orderIndex].status;
    orders[orderIndex].status = newStatus;
    
    let pointsAwarded = 0;

    // Award loyalty points on completion
    if (newStatus === 'Completed' && originalStatus !== 'Completed') {
        const generalSettings = await getGeneralSettings();
        if (generalSettings.loyaltyProgramEnabled && orders[orderIndex].userId && generalSettings.pointsPerCurrencyUnit) {
            const allUsers = await getUsers();
            const userIndex = allUsers.findIndex(u => u.id === orders[orderIndex].userId);
            if (userIndex > -1) {
                const pointsEarned = Math.floor(orders[orderIndex].total * generalSettings.pointsPerCurrencyUnit);
                if(pointsEarned > 0) {
                    allUsers[userIndex].loyaltyPoints = (allUsers[userIndex].loyaltyPoints || 0) + pointsEarned;
                    pointsAwarded = pointsEarned;
                    // Intentionally not awaiting this save to prevent blocking the order status update response
                    saveUsers(allUsers).then(res => {
                        if(!res.success) console.error(`[Order Action] CRITICAL: Failed to save loyalty points for user ${orders[orderIndex].userId} after order ${orderId} completion. Reason: ${res.message}`);
                        else console.log(`[Order Action] Awarded ${pointsAwarded} loyalty points to user ${orders[orderIndex].userId}`);
                    });
                }
            }
        }
    }

    const saveResult = await saveOrders(orders);

    if (saveResult.success) {
      if (newStatus !== originalStatus && orders[orderIndex].email) {
        const notificationSettings = await getNotificationSettings();
        const generalSettings = await getGeneralSettings();
        const customerEmail = orders[orderIndex].email!;
        const orderData = orders[orderIndex];

        if (newStatus === 'Completed' && notificationSettings.user.emailOnOrderCompletion) {
          const htmlContent = await generateOrderCompletedEmailHtml(orderData, generalSettings.companyName || "Your Restaurant", pointsAwarded);
          await sendEmail({
            to: customerEmail,
            subject: `TableMaster Order #${String(orderData.id).substring(0,8)} is Complete!`,
            html: htmlContent,
          });
        } else if (newStatus !== 'Completed' && notificationSettings.user.emailOnOrderStatusUpdate) {
           const htmlContent = await generateOrderStatusUpdateEmailHtml(orderData, newStatus, generalSettings.companyName || "Your Restaurant");
           await sendEmail({
             to: customerEmail,
             subject: `TableMaster Order #${String(orderData.id).substring(0,8)} - Status Update: ${newStatus}`,
             html: htmlContent,
           });
        }
      }
      return { success: true, message: `Order ${orderId} status updated to ${newStatus}.` };
    } else {
      orders[orderIndex].status = originalStatus;
      return { success: false, message: `Failed to save updated orders: ${saveResult.message}` };
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, message: `An unexpected error occurred: ${(error as Error).message}` };
  }
}

export async function placeNewWalkInOrder(orderData: Order): Promise<{ success: boolean; message: string; orderId?: string }> {
  try {
    const generalSettings = await getGeneralSettings();
    const finalStatus: OrderStatus = generalSettings.autoApproveNewOrders ? 'Preparing' : 'Pending';
    const finalOrder: Order = { ...orderData, status: finalStatus };

    const currentOrders = await getOrders();
    if (currentOrders.some(o => o.id === finalOrder.id)) {
      return { success: false, message: `Order ID ${finalOrder.id} already exists. Please try again.` };
    }
    
    const updatedOrders = [...currentOrders, finalOrder];
    const result = await saveOrders(updatedOrders);

    if (result.success) {
      return { success: true, message: `Walk-in order #${String(finalOrder.id).substring(0,8)} placed successfully.`, orderId: finalOrder.id };
    } else {
      return { success: false, message: `Failed to save walk-in order: ${result.message}` };
    }
  } catch (error) {
    console.error("Error placing new walk-in order:", error);
    return { success: false, message: `An unexpected error occurred: ${(error as Error).message}` };
  }
}

export async function placeInRoomOrder(bookingId: string, userId: string, items: OrderItem[]): Promise<{ success: boolean; message: string; orderId?: string }> {
    try {
        const allBookings = await getBookings();
        const booking = allBookings.find(b => b.id === bookingId && b.userId === userId && b.status === 'confirmed' && b.bookingType === 'room');

        if (!booking) {
            return { success: false, message: "Active, confirmed room booking not found for this user." };
        }
        if (!booking.assignedResourceId) {
             return { success: false, message: "Booking has no assigned room. Cannot place order." };
        }

        const roomId = booking.assignedResourceId;
        const roomStock = await getRoomStock(roomId);
        let stockToUpdate = [...roomStock];
        let stockSufficient = true;
        let insufficientItems: string[] = [];

        for (const orderItem of items) {
            const stockItemIndex = stockToUpdate.findIndex(si => si.menuItemId === orderItem.menuItemId);
            if (stockItemIndex === -1 || stockToUpdate[stockItemIndex].stockQuantity < orderItem.quantity) {
                stockSufficient = false;
                insufficientItems.push(orderItem.name);
            } else {
                stockToUpdate[stockItemIndex].stockQuantity -= orderItem.quantity;
            }
        }
        
        if (!stockSufficient) {
            return { success: false, message: `Insufficient stock for: ${insufficientItems.join(', ')}. Please contact reception.` };
        }

        const generalSettings = await getGeneralSettings();
        const newOrder: Order = {
            id: `ROOM-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
            userId: userId,
            items: items,
            total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            status: generalSettings.autoApproveNewOrders ? 'Preparing' : 'Pending',
            orderType: 'In-Room Dining',
            customerName: booking.customerName,
            email: booking.email,
            phone: booking.phone,
            createdAt: new Date().toISOString(),
            bookingId: bookingId,
        };
        
        const currentOrders = await getOrders();
        const updatedOrders = [...currentOrders, newOrder];
        const saveOrderResult = await saveOrders(updatedOrders);
        if (!saveOrderResult.success) {
            throw new Error(`Failed to save new order: ${saveOrderResult.message}`);
        }
        
        const saveStockResult = await saveRoomStock(roomId, stockToUpdate);
        if (!saveStockResult.success) {
            // This is a critical failure state. The order was created but stock wasn't decremented.
            // In a real app, this would require a transaction rollback. Here, we log a critical error.
            console.error(`CRITICAL: Order ${newOrder.id} was created, but failed to update room stock for room ${roomId}. Manual correction needed.`);
            // Inform the user but the order is still placed.
            return { success: true, orderId: newOrder.id, message: `Order placed successfully, but a stock update issue occurred. Please notify staff.` };
        }

        return { success: true, orderId: newOrder.id, message: "Your in-room order has been placed successfully." };

    } catch (error) {
        console.error("Error placing in-room order:", error);
        return { success: false, message: `An unexpected error occurred: ${(error as Error).message}` };
    }
}


export async function placePublicTakeawayOrder(orderData: Order): Promise<{
  success: boolean;
  orderId?: string;
  message: string;
  customerEmailStatus: { sent: boolean; error?: string; messageId?: string };
  adminEmailStatus: { sent: boolean; error?: string; messageId?: string };
}> {
  const generalSettings = await getGeneralSettings();

  if (orderData.userId) {
    const allUsers = await getUsers();
    const currentUser = allUsers.find(u => u.id === orderData.userId);

    if (currentUser && generalSettings.dailyOrderLimitsByRole) {
      try {
        const limits: Record<UserRole, number> = JSON.parse(generalSettings.dailyOrderLimitsByRole);
        const userRoleLimit = limits[currentUser.role];

        if (userRoleLimit !== undefined && userRoleLimit > 0) {
          const allOrders = await getOrders();
          const userOrdersToday = allOrders.filter(order => {
            if (order.userId !== orderData.userId) return false;
            try {
              return isToday(parseISO(order.createdAt));
            } catch (e) {
              return false;
            }
          });

          if (userOrdersToday.length >= userRoleLimit) {
            const message = `You have reached your daily order limit of ${userRoleLimit} orders.`;
            console.warn(`[Order Action] User ${orderData.userId} (Role: ${currentUser.role}) has reached their daily order limit.`);
            return {
              success: false,
              message: message,
              customerEmailStatus: { sent: false, error: message },
              adminEmailStatus: { sent: false, error: "Order not placed due to limit." },
            };
          }
        }
      } catch (e) {
        console.error("Error parsing or applying daily order limits by role:", e);
      }
    }
  }

  try {
    const finalStatus: OrderStatus = generalSettings.autoApproveNewOrders ? 'Preparing' : 'Pending';
    const finalOrder: Order = { ...orderData, status: finalStatus };

    const currentOrders = await getOrders();
    if (currentOrders.some(o => o.id === finalOrder.id)) {
      return {
        success: false,
        message: `Order ID ${finalOrder.id} already exists. Please try again.`,
        customerEmailStatus: { sent: false, error: "Order not saved" },
        adminEmailStatus: { sent: false, error: "Order not saved" },
      };
    }

    const updatedOrders = [...currentOrders, finalOrder];
    const saveResult = await saveOrders(updatedOrders);

    if (!saveResult.success) {
      return {
        success: false,
        message: `Failed to save order: ${saveResult.message}`,
        customerEmailStatus: { sent: false, error: saveResult.message },
        adminEmailStatus: { sent: false, error: saveResult.message },
      };
    }

    // Order saved, now attempt emails
    let customerEmailResult: EmailStatus = { sent: false, error: "Email not attempted or not applicable." };
    let adminEmailResult: EmailStatus = { sent: false, error: "Email not attempted or not applicable." };

    if (finalOrder.email) {
      const emailRes = await sendOrderConfirmationEmailToCustomer(finalOrder, finalOrder.email, generalSettings.currencyCode, generalSettings.currencySymbol);
      customerEmailResult = { sent: emailRes.success, error: emailRes.success ? undefined : emailRes.message, messageId: emailRes.messageId };
    } else {
      customerEmailResult = { sent: false, error: "No customer email provided for order." };
    }

    const adminRecipientEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS || generalSettings.footerContactEmail || process.env.EMAIL_FROM;
    if (adminRecipientEmail) {
      const adminRes = await sendNewOrderNotificationToAdmin(finalOrder, adminRecipientEmail);
      adminEmailResult = { sent: adminRes.success, error: adminRes.success ? undefined : adminRes.message, messageId: adminRes.messageId };
    } else {
      adminEmailResult = { sent: false, error: "Admin notification email not configured." };
    }

    return {
      success: true,
      orderId: finalOrder.id,
      message: `Order #${String(finalOrder.id).substring(0,8)} placed successfully.`,
      customerEmailStatus: customerEmailResult,
      adminEmailStatus: adminEmailResult,
    };

  } catch (error) {
    console.error("Error placing public takeaway order:", error);
    return {
      success: false,
      message: `An unexpected error occurred: ${(error as Error).message}`,
      customerEmailStatus: { sent: false, error: (error as Error).message },
      adminEmailStatus: { sent: false, error: (error as Error).message },
    };
  }
}


export async function updateOrderPaymentDetails(
  orderId: string, 
  paymentType: PaymentType, 
  paymentId?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const orders = await getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return { success: false, message: `Order with ID ${orderId} not found.` };
    }

    orders[orderIndex].paymentType = paymentType;
    orders[orderIndex].paymentId = paymentId || ''; 
    
    const saveResult = await saveOrders(orders);

    if (saveResult.success) {
      return { success: true, message: `Payment details for order ${orderId} updated.` };
    } else {
      return { success: false, message: `Failed to save updated payment details: ${saveResult.message}` };
    }
  } catch (error) {
    console.error("Error updating order payment details:", error);
    return { success: false, message: `An unexpected error occurred: ${(error as Error).message}` };
  }
}
