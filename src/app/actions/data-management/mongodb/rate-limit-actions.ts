// src/app/actions/data-management/mongodb/rate-limit-actions.ts
'use server';
import { connectToDatabase } from '@/lib/mongodb';
import type { RateLimitConfig } from '@/lib/types';
import { defaultRateLimitConfig } from '@/lib/types';
import Papa from 'papaparse';
import { RATE_LIMIT_CONFIG_HEADERS } from '../_csv-headers';


// Define a specific type for this document
interface RateLimitConfigDoc extends RateLimitConfig {
  _id: 'rateLimitConfig';
}

export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  const { db } = await connectToDatabase();
  // Use the specific document type to inform TypeScript about the _id
  const settings = await db.collection<RateLimitConfigDoc>('settings').findOne({ _id: 'rateLimitConfig' });
  if (settings) {
    const { _id, ...rest } = settings;
    return { ...defaultRateLimitConfig, ...rest };
  }
  return defaultRateLimitConfig;
}

export async function saveRateLimitConfig(config: RateLimitConfig): Promise<{ success: boolean; message: string; }> {
   const { db } = await connectToDatabase();
    try {
        await db.collection<RateLimitConfigDoc>('settings').updateOne(
            { _id: 'rateLimitConfig' },
            { $set: config },
            { upsert: true }
        );
        return { success: true, message: "Rate limit settings saved successfully to MongoDB." };
    } catch (error) {
        console.error("Error saving rate limit settings to MongoDB:", error);
        return { success: false, message: `Error saving rate limit settings to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadRateLimitConfigCsv(): Promise<string> {
    const config = await getRateLimitConfig();
    const headers = RATE_LIMIT_CONFIG_HEADERS.trim().split(',');
    return Papa.unparse([config], { header: true, columns: headers });
}

export async function uploadRateLimitConfigCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: true, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    if (parsed.data.length === 0) {
        return { success: false, message: "Uploaded CSV is empty." };
    }
    if (parsed.data.length > 1) {
        return { success: false, message: "CSV should contain only one row for rate limit configurations." };
    }
    
    const uploadedConfig = parsed.data[0];
    const configToSave: RateLimitConfig = {
      otpRequestsPerHour: Number(uploadedConfig.otpRequestsPerHour) || defaultRateLimitConfig.otpRequestsPerHour,
      otpRequestsPerDay: Number(uploadedConfig.otpRequestsPerDay) || defaultRateLimitConfig.otpRequestsPerDay,
      signupAttemptsPerHour: Number(uploadedConfig.signupAttemptsPerHour) || defaultRateLimitConfig.signupAttemptsPerHour,
      signupAttemptsPerDay: Number(uploadedConfig.signupAttemptsPerDay) || defaultRateLimitConfig.signupAttemptsPerDay,
    };

    const result = await saveRateLimitConfig(configToSave);
    return { ...result, count: 1 };
}
