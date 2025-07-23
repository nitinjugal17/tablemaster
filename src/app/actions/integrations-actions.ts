// src/app/actions/integrations-actions.ts
'use server';

import type { Order, IntegrationPlatform, OrderItem } from '@/lib/types';
import { getIntegrationSettings } from './data-management-actions';
import { addLogEntry } from './logging-actions';

/**
 * Sends a new order to a specified third-party delivery platform if it's enabled.
 * This is a mock implementation that logs the action.
 * @param {Order} order - The order object to be sent.
 * @param {IntegrationPlatform} platform - The target platform (e.g., 'zomato').
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendOrderToPlatform(order: Order, platform: IntegrationPlatform): Promise<{success: boolean, message: string}> {
  try {
    const settings = await getIntegrationSettings();
    const platformSetting = settings.find(s => s.platform === platform);

    if (!platformSetting || !platformSetting.isEnabled) {
      return { success: true, message: `Integration for ${platform} is disabled. Order not sent.` };
    }

    if (!platformSetting.apiKey) {
      return { success: false, message: `API key for ${platform} is not configured.` };
    }
    
    // Safely parse order.items which might be a JSON string from a CSV
    const orderItemsArray: OrderItem[] = Array.isArray(order.items)
      ? order.items
      : typeof order.items === 'string'
      ? JSON.parse(order.items)
      : [];

    const payload = {
      order_id: order.id,
      customer_name: order.customerName,
      total_amount: order.total,
      items: orderItemsArray.map(item => ({
        id: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      // Add other platform-specific fields here
    };

    // MOCK API CALL
    console.log(`MOCK: Sending new order to ${platform.toUpperCase()}...`);
    console.log(`  URL: https://api.${platform}.com/v1/orders`);
    console.log(`  API Key: ${platformSetting.apiKey.substring(0, 4)}...`);
    console.log(`  Payload:`, JSON.stringify(payload, null, 2));
    
    // In a real implementation, you would use fetch:
    // const response = await fetch(`https://api.${platform}.com/v1/orders`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${platformSetting.apiKey}`,
    //   },
    //   body: JSON.stringify(payload),
    // });
    // if (!response.ok) throw new Error(`API call failed with status ${response.status}`);
    
    const message = `Order #${String(order.id).substring(0,8)} successfully sent to ${platform}. (Mocked)`;
    await addLogEntry(`[Integration] ${message}`, 'INFO');
    return { success: true, message };
    
  } catch (error) {
    const errorMessage = (error as Error).message;
    await addLogEntry(`[Integration] Failed to send order to ${platform}: ${errorMessage}`, 'ERROR');
    return { success: false, message: `Failed to send order to ${platform}: ${errorMessage}` };
  }
}

/**
 * Updates the order status on a third-party platform.
 * This is a mock implementation.
 * @param {string} orderId - The ID of the order to update.
 * @param {string} newStatus - The new status (e.g., 'accepted', 'food_ready', 'cancelled').
 * @param {IntegrationPlatform} platform - The target platform.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function updatePlatformOrderStatus(orderId: string, newStatus: string, platform: IntegrationPlatform): Promise<{success: boolean, message: string}> {
   // Similar logic as sendOrderToPlatform
  // ... fetch settings, check if enabled ...
  const message = `Status of order #${String(orderId).substring(0,8)} updated to "${newStatus}" on ${platform}. (Mocked)`;
  await addLogEntry(`[Integration] ${message}`, 'INFO');
  return { success: true, message };
}

/**
 * Cancels an order on a third-party platform.
 * This is a mock implementation.
 * @param {string} orderId - The ID of the order to cancel.
 * @param {string} reason - The reason for cancellation.
 * @param {IntegrationPlatform} platform - The target platform.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function cancelOrderOnPlatform(orderId: string, reason: string, platform: IntegrationPlatform): Promise<{success: boolean, message: string}> {
   // Similar logic as sendOrderToPlatform
  // ... fetch settings, check if enabled ...
  const message = `Order #${String(orderId).substring(0,8)} cancelled on ${platform} for reason: ${reason}. (Mocked)`;
  await addLogEntry(`[Integration] ${message}`, 'INFO');
  return { success: true, message };
}
