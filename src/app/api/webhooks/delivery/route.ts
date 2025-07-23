// src/app/api/webhooks/delivery/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { addLogEntry } from '@/app/actions/logging-actions';

/**
 * Handles incoming webhook notifications from third-party delivery services.
 * This endpoint is designed to be the single point of contact for services
 * like Zomato and Swiggy to push real-time order updates.
 *
 * @param {NextRequest} request The incoming request object.
 * @returns {NextResponse} A response object.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers);
    const origin = headers['user-agent'] || headers['x-forwarded-for'] || 'Unknown';
    
    // Log the entire webhook payload for debugging and development
    await addLogEntry(
      `[Webhook] Received webhook from origin: ${origin}.`,
      'INFO'
    );
    await addLogEntry(
      `[Webhook] Headers: ${JSON.stringify(headers)}`, 'INFO'
    );
    await addLogEntry(
      `[Webhook] Payload: ${JSON.stringify(body)}`, 'INFO'
    );

    // TODO: Add logic to differentiate between Zomato, Swiggy, etc.
    // This could be done by checking a specific header they send,
    // or by having separate endpoints like /api/webhooks/zomato.
    // For now, we just log it.

    // TODO: Add logic to process the order data.
    // - Verify webhook signature to ensure it's authentic.
    // - Parse the payload to extract order details.
    // - Create or update an order in TableMaster's database.
    // - Send notifications if needed.

    return NextResponse.json({ success: true, message: "Webhook received successfully." }, { status: 200 });
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred.';
    await addLogEntry(
      `[Webhook] Error processing webhook: ${errorMessage}`,
      'ERROR'
    );
    console.error('[Webhook Error]', error);
    return NextResponse.json({ success: false, error: "Failed to process webhook." }, { status: 500 });
  }
}

// Basic GET handler for verification if required by platforms
export async function GET() {
    await addLogEntry('[Webhook] Received GET request to webhook endpoint. Typically for verification.', 'INFO');
    return NextResponse.json({ message: "Webhook endpoint is active." });
}
