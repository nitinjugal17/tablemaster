
// src/app/actions/order-actions.ts
'use server';

import { sendEmail } from '@/lib/emailService';
import type { Order, InvoiceSetupSettings, OrderItem, CurrencyCode, PaymentType, UserRole, Booking, OrderStatus, OrderHistoryEvent, IntegrationPlatform } from '@/lib/types';
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
    getMenuItems,
    getStockItems,
    saveStockItems,
    getStockMenuMappings,
    getPrinterSettings
} from './data-management-actions';
import { sendOrderToPlatform, updatePlatformOrderStatus } from './integrations-actions';
import { format, parseISO, isToday, isValid, differenceInMinutes, differenceInHours } from 'date-fns';
import { sendTestPrintCommand } from './printer-actions';

type EmailStatus = { sent: boolean; error?: string; messageId?: string };

// In-memory queue for KOT printing
let kotQueue: Order[] = [];

export async function getPendingKOTQueue(): Promise<Order[]> {
    return kotQueue;
}

export async function printPendingKOTs(): Promise<{ success: boolean; message: string }> {
    if (kotQueue.length === 0) {
        return { success: false, message: "No KOTs are pending in the queue." };
    }

    const settings = await getGeneralSettings();
    const defaultPrinterId = settings.defaultChefKotPrinterId || settings.defaultThermalPrinterId;
    
    if (!defaultPrinterId) {
        return { success: false, message: "No default Chef or Main thermal printer is set for KOT printing." };
    }
    
    const printers = await getPrinterSettings();
    const printerToUse = printers.find(p => p.id === defaultPrinterId);

    if (!printerToUse || printerToUse.connectionType === 'system') {
        const reason = !printerToUse ? 'not found' : 'a system printer';
        return { success: false, message: `Cannot batch print because the configured KOT printer is ${reason}.` };
    }
    
    // Clear the queue optimistically before printing
    const ordersToPrint = [...kotQueue];
    kotQueue = [];

    console.log(`[KOT Batch Print] Printing ${ordersToPrint.length} queued KOTs...`);
    
    try {
        const result = await sendTestPrintCommand({ printer: printerToUse, kotData: { orders: ordersToPrint } });
        if (result.success) {
            return { success: true, message: `Successfully sent ${ordersToPrint.length} KOTs to the printer.` };
        } else {
            // If printing fails, add the items back to the queue
            kotQueue = [...ordersToPrint, ...kotQueue];
            return { success: false, message: `Failed to print KOTs: ${result.message}` };
        }
    } catch (error) {
        kotQueue = [...ordersToPrint, ...kotQueue]; // Add back on error
        return { success: false, message: `An error occurred during printing: ${(error as Error).message}` };
    }
}


async function triggerAutoKotPrint(order: Order) {
  console.log(`[AutoKOT] Checking auto-print rules for order ${order.id}.`);
  const settings = await getGeneralSettings();

  if (!settings.enableAutoKotPrinting) {
    console.log(`[AutoKOT] Auto-printing is disabled.`);
    return;
  }
  
  const defaultPrinterId = settings.defaultChefKotPrinterId || settings.defaultThermalPrinterId;
  if (!defaultPrinterId) {
    console.warn(`[AutoKOT] Auto-printing enabled, but no default Chef KOT or main thermal printer is set.`);
    return;
  }
  
  const printers = await getPrinterSettings();
  const printerToUse = printers.find(p => p.id === defaultPrinterId);
  if (!printerToUse || printerToUse.connectionType !== 'network') {
      console.log(`[AutoKOT] Auto-printing skipped. Configured printer is not a network printer.`);
      return;
  }

  if (settings.autoKotPrintMode === 'batch') {
    kotQueue.push(order);
    console.log(`[AutoKOT] Order ${order.id} added to batch queue. Queue size: ${kotQueue.length}.`);
    const threshold = settings.kotBatchPrintThreshold || 2;
    if (kotQueue.length >= threshold) {
      await printPendingKOTs();
    }
  } else {
    // Immediate mode
    console.log(`[AutoKOT] Immediate print mode. Sending KOT for order ${order.id}.`);
    await sendTestPrintCommand({ printer: printerToUse, kotData: { order } });
  }
}

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
  const orderItemsArray: OrderItem[] = Array.isArray(order.items)
    ? order.items
    : typeof order.items === 'string'
    ? JSON.parse(order.items)
    : [];
    
  for (const item of orderItemsArray) {
    const itemPriceFormatted = await convertPriceForEmail(item.price, displayCurrencyCode, displayCurrencySymbol);
    const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                            ? `${item.name} (${item.selectedPortion})` 
                            : item.name;
    itemsHtml += `<li>${itemDisplayName} (x${item.quantity})${item.note ? ` <em style="font-size:0.9em; color:#555;">(${item.note})</em>` : ''} - ${itemPriceFormatted}</li>`;
  }
  const totalFormatted = await convertPriceForEmail(order.total, displayCurrencyCode, displayCurrencySymbol);
  const formattedDate = order.createdAt ? format(typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt, "MMM d, yyyy, h:mm a") : 'N/A';
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
  const orderItemsArray: OrderItem[] = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []);
  for (const item of orderItemsArray) {
    const itemPriceFormatted = await convertPriceForEmail(item.price, displayCurrencyCode, displayCurrencySymbol); 
    const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                            ? `${item.name} (${item.selectedPortion})` 
                            : item.name;
    itemsHtml += `<li>${itemDisplayName} (x${item.quantity})${item.note ? ` <em style="font-size:0.9em; color:#555;">(${item.note})</em>` : ''} - ${itemPriceFormatted}</li>`;
  }
  const totalFormatted = await convertPriceForEmail(order.total, displayCurrencyCode, displayCurrencySymbol);
  const formattedDate = order.createdAt ? format(typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt, "MMM d, yyyy, h:mm a") : 'N/A';
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
  const formattedDate = order.createdAt ? format(typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt, "MMM d, yyyy, h:mm a") : 'N/A';
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
  const formattedDate = order.createdAt ? format(typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt, "MMM d, yyyy, h:mm a") : 'N/A';
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

export async function updateOrder(orderData: Order, pin?: string): Promise<{ success: boolean; message: string }> {
  try {
    const orders = await getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderData.id);

    if (orderIndex === -1) {
      return { success: false, message: `Order with ID ${orderData.id} not found.` };
    }
    
    const originalOrder = orders[orderIndex];
    const isLocked = originalOrder.status === 'Completed' || originalOrder.status === 'Cancelled';

    if (isLocked) {
        const settings = await getGeneralSettings();
        if (settings.completedOrderPin && String(settings.completedOrderPin) !== String(pin)) {
            return { success: false, message: 'Invalid PIN. Cannot edit a completed/cancelled order.' };
        }
    }

    orders[orderIndex] = { ...originalOrder, ...orderData, createdAt: originalOrder.createdAt, history: originalOrder.history };

    const saveResult = await saveOrders(orders);
    if (saveResult.success) {
      return { success: true, message: `Order ${orderData.id} updated successfully.` };
    } else {
      return { success: false, message: `Failed to save updated order: ${saveResult.message}` };
    }
  } catch (error) {
    console.error(`Error updating order ${orderData.id}:`, error);
    return { success: false, message: `An unexpected error occurred: ${(error as Error).message}` };
  }
}

export async function updateOrderStatus(orderId: string, newStatus: Order['status'], pin?: string): Promise<{ success: boolean; message: string }> {
  try {
    const orders = await getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return { success: false, message: `Order #${orderId} not found.` };
    }
    
    const originalOrder = orders[orderIndex];
    if (newStatus === originalOrder.status) {
        return { success: true, message: `Order status is already ${newStatus}. No change made.` };
    }
    
    const isLocked = originalOrder.status === 'Completed' || originalOrder.status === 'Cancelled';
    if (isLocked) {
        const settings = await getGeneralSettings();
        if (settings.completedOrderPin && String(settings.completedOrderPin) !== String(pin)) {
            return { success: false, message: 'Invalid PIN. Cannot change status of a completed/cancelled order.' };
        }
    }

    const updatedOrderData = { ...originalOrder };
    updatedOrderData.status = newStatus;
    
    const historyEvent: OrderHistoryEvent = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      notes: `Status changed from ${originalOrder.status} to ${newStatus}`
    };
    updatedOrderData.history = [...(updatedOrderData.history || []), historyEvent];
    
    let pointsAwarded = 0;

    if (newStatus === 'Preparing' && originalOrder.status !== 'Preparing') {
      // Trigger KOT print when status changes to 'Preparing'
      await triggerAutoKotPrint(updatedOrderData);
    }
    
    if (newStatus === 'Completed' && originalOrder.status !== 'Completed') {
        const generalSettings = await getGeneralSettings();
        
        const allStockItems = await getStockItems();
        const allMappings = await getStockMenuMappings();
        let stockUpdated = false;
        
        const orderItemsArray: OrderItem[] = Array.isArray(updatedOrderData.items) ? updatedOrderData.items : (typeof updatedOrderData.items === 'string' ? JSON.parse(updatedOrderData.items) : []);

        for (const orderItem of orderItemsArray) {
            const mappingsForItem = allMappings.filter(m => m.menuItemId === orderItem.menuItemId);
            for (const mapping of mappingsForItem) {
                const stockItemIndex = allStockItems.findIndex(si => si.id === mapping.stockItemId);
                if (stockItemIndex > -1) {
                    allStockItems[stockItemIndex].currentStock -= (mapping.quantityUsedPerServing * orderItem.quantity);
                    stockUpdated = true;
                }
            }
        }
        if (stockUpdated) {
            await saveStockItems(allStockItems);
            console.log(`[Order Action] Inventory deducted for order ${orderId}.`);
        }

        if (generalSettings.loyaltyProgramEnabled && updatedOrderData.userId && generalSettings.pointsPerCurrencyUnit) {
            const allUsers = await getUsers();
            const userIndexToUpdate = allUsers.findIndex(u => u.id === updatedOrderData.userId);
            if (userIndexToUpdate > -1) {
                const pointsEarned = Math.floor(updatedOrderData.total * generalSettings.pointsPerCurrencyUnit);
                if(pointsEarned > 0) {
                    allUsers[userIndexToUpdate].loyaltyPoints = (allUsers[userIndexToUpdate].loyaltyPoints || 0) + pointsEarned;
                    pointsAwarded = pointsEarned;
                    await saveUsers(allUsers);
                    console.log(`[Order Action] Awarded ${pointsAwarded} loyalty points to user ${updatedOrderData.userId}`);
                }
            }
        }
    }
    
    orders[orderIndex] = updatedOrderData;

    const saveResult = await saveOrders(orders);

    if (saveResult.success) {
      const orderTypeIsIntegration = (updatedOrderData.orderType as string).startsWith('zomato') || (updatedOrderData.orderType as string).startsWith('swiggy');
      if (orderTypeIsIntegration) {
          const platform = updatedOrderData.orderType as IntegrationPlatform;
          await updatePlatformOrderStatus(orderId, newStatus.toLowerCase().replace(/\s/g, '_'), platform);
      }

      if (updatedOrderData.email) {
        const notificationSettings = await getNotificationSettings();
        const generalSettings = await getGeneralSettings();
        const customerEmail = updatedOrderData.email!;

        if (newStatus === 'Completed' && notificationSettings.user.emailOnOrderCompletion) {
          const htmlContent = await generateOrderCompletedEmailHtml(updatedOrderData, generalSettings.companyName || "Your Restaurant", pointsAwarded);
          await sendEmail({ to: customerEmail, subject: `TableMaster Order #${String(updatedOrderData.id).substring(0,8)} is Complete!`, html: htmlContent });
        } else if (newStatus !== 'Completed' && notificationSettings.user.emailOnOrderStatusUpdate) {
           const htmlContent = await generateOrderStatusUpdateEmailHtml(updatedOrderData, newStatus, generalSettings.companyName || "Your Restaurant");
           await sendEmail({ to: customerEmail, subject: `TableMaster Order #${String(updatedOrderData.id).substring(0,8)} - Status Update: ${newStatus}`, html: htmlContent });
        }
      }
      return { success: true, message: `Order ${orderId} status updated to ${newStatus}.` };
    } else {
      return { success: false, message: `Failed to save updated orders: ${saveResult.message}` };
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false, message: `An unexpected error occurred: ${(error as Error).message}` };
  }
}

export async function placeNewWalkInOrder(orderData: Partial<Order>): Promise<{ success: boolean; message: string; orderId?: string }> {
  try {
    const generalSettings = await getGeneralSettings();
    const finalStatus: OrderStatus = generalSettings.autoApproveNewOrders ? 'Preparing' : 'Pending';
    const now = new Date().toISOString();
    
    const initialHistory: OrderHistoryEvent[] = [
      { status: 'Pending', timestamp: now, notes: 'Order created.' }
    ];
    if (finalStatus === 'Preparing') {
      initialHistory.push({ status: 'Preparing', timestamp: now, notes: 'Auto-approved.' });
    }

    const { createdAt, history, ...restOfOrderData } = orderData; 

    const finalOrder: Order = {
        id: `POS-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
        customerName: restOfOrderData.customerName || 'Walk-in Guest',
        items: restOfOrderData.items || [],
        total: restOfOrderData.total || 0,
        status: finalStatus,
        orderType: restOfOrderData.orderType || 'Dine-in',
        tableNumber: restOfOrderData.tableNumber,
        createdAt: now,
        history: initialHistory,
        userId: restOfOrderData.userId,
        outletId: restOfOrderData.outletId,
    };

    const currentOrders = await getOrders();
    if (currentOrders.some(o => o.id === finalOrder.id)) {
      return { success: false, message: `Order ID ${finalOrder.id} already exists. Please try again.` };
    }
    
    const updatedOrders = [...currentOrders, finalOrder];
    const result = await saveOrders(updatedOrders);

    if (result.success) {
      if (finalOrder.status === 'Preparing') {
        await triggerAutoKotPrint(finalOrder);
      }
      const orderTypeIsIntegration = (finalOrder.orderType as string).startsWith('zomato') || (finalOrder.orderType as string).startsWith('swiggy');
      if (orderTypeIsIntegration) {
        await sendOrderToPlatform(finalOrder, finalOrder.orderType as IntegrationPlatform);
      }
      
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
        const finalStatus: OrderStatus = generalSettings.autoApproveNewOrders ? 'Preparing' : 'Pending';
        const now = new Date().toISOString();
        const newOrder: Order = {
            id: `ROOM-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
            userId: userId,
            items: items,
            total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            status: finalStatus,
            orderType: 'In-Room Dining',
            customerName: booking.customerName,
            email: booking.email,
            phone: booking.phone,
            createdAt: now,
            history: [{ status: finalStatus, timestamp: now, notes: 'Order created via In-Room Dining.' }],
            bookingId: bookingId,
            notes: "Order placed via in-room dining service.",
        };
        
        const currentOrders = await getOrders();
        const updatedOrders = [...currentOrders, newOrder];
        const saveOrderResult = await saveOrders(updatedOrders);
        if (!saveOrderResult.success) {
            throw new Error(`Failed to save new order: ${saveOrderResult.message}`);
        }
        
        if (newOrder.status === 'Preparing') {
            await triggerAutoKotPrint(newOrder);
        }
        
        const saveStockResult = await saveRoomStock(roomId, stockToUpdate);
        if (!saveStockResult.success) {
            console.error(`CRITICAL: Order ${newOrder.id} was created, but failed to update room stock for room ${roomId}. Manual correction needed.`);
            return { success: true, orderId: newOrder.id, message: `Order placed successfully, but a stock update issue occurred. Please notify staff.` };
        }

        return { success: true, orderId: newOrder.id, message: "Your in-room order has been placed successfully." };

    } catch (error) {
        console.error("Error placing in-room order:", error);
        return { success: false, message: `An unexpected error occurred: ${(error as Error).message}` };
    }
}


export async function placePublicTakeawayOrder(orderData: Partial<Order>): Promise<{
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
              const orderDate = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt;
              return isToday(orderDate);
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
    const now = new Date().toISOString();
    const { createdAt, history, ...restOfOrderData } = orderData; 
    
    const initialHistory: OrderHistoryEvent[] = [
      { status: 'Pending', timestamp: now, notes: 'Order created via public takeaway.' }
    ];
    if (finalStatus === 'Preparing') {
      initialHistory.push({ status: 'Preparing', timestamp: now, notes: 'Auto-approved.' });
    }

    const finalOrder: Order = { 
        ...restOfOrderData, 
        status: finalStatus,
        createdAt: now,
        history: initialHistory,
    } as Order;

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
        adminEmailStatus: { sent: false, error: "Order not saved" },
      };
    }

    // Trigger auto-print if needed
    if (finalOrder.status === 'Preparing') {
      await triggerAutoKotPrint(finalOrder);
    }

    // Order saved, now attempt emails
    let customerEmailResult: EmailStatus = { sent: false, error: "Email not attempted or not applicable." };
    let adminEmailResult: EmailStatus = { sent: false, error: "Email not attempted or not applicable." };
    
    const orderItemsArray: OrderItem[] = Array.isArray(finalOrder.items) ? finalOrder.items : (typeof finalOrder.items === 'string' ? JSON.parse(finalOrder.items) : []);
    const orderForEmail = {...finalOrder, items: orderItemsArray};


    if (finalOrder.email) {
      const emailRes = await sendOrderConfirmationEmailToCustomer(orderForEmail, finalOrder.email, generalSettings.currencyCode, generalSettings.currencySymbol);
      customerEmailResult = { sent: emailRes.success, error: emailRes.success ? undefined : emailRes.message, messageId: emailRes.messageId };
    } else {
      customerEmailResult = { sent: false, error: "No customer email provided for order." };
    }

    const adminRecipientEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS || generalSettings.footerContactEmail || process.env.EMAIL_FROM;
    if (adminRecipientEmail) {
      const adminRes = await sendNewOrderNotificationToAdmin(orderForEmail, adminRecipientEmail);
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
    
    const originalOrder = orders[orderIndex];

    if (originalOrder.status === 'Completed' && originalOrder.paymentType !== 'Pending') {
      return { success: false, message: `Payment for this completed order has already been recorded and cannot be changed.` };
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
