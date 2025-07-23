// src/app/api/health/route.ts

import { NextResponse } from 'next/server';

/**
 * A lightweight API endpoint to check if the server is alive and responding.
 * This is used by the client-side heartbeat mechanism to determine the true online status.
 *
 * @returns {NextResponse} A JSON response indicating success.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
