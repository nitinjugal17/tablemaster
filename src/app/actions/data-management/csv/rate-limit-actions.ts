// src/app/actions/data-management/rate-limit-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { RATE_LIMIT_CONFIG_HEADERS } from '../_csv-headers';
import type { RateLimitConfig } from '@/lib/types';
import { defaultRateLimitConfig } from '@/lib/types';

const rateLimitConfigCsvPath = path.join(dataDir, 'rate-limit-config.csv');

export async function getRateLimitConfig(): Promise<RateLimitConfig> {
  try {
    const data = await readCsvFile<any>(rateLimitConfigCsvPath, RATE_LIMIT_CONFIG_HEADERS);
    if (data.length === 0) {
      console.warn('[Rate Limit Action] rate-limit-config.csv is empty or not found. Creating with default values.');
      await saveRateLimitConfig(defaultRateLimitConfig);
      return { ...defaultRateLimitConfig };
    }
    const loadedConfig = data[0];
    return {
        otpRequestsPerHour: Number(loadedConfig.otpRequestsPerHour) || defaultRateLimitConfig.otpRequestsPerHour,
        otpRequestsPerDay: Number(loadedConfig.otpRequestsPerDay) || defaultRateLimitConfig.otpRequestsPerDay,
        signupAttemptsPerHour: Number(loadedConfig.signupAttemptsPerHour) || defaultRateLimitConfig.signupAttemptsPerHour,
        signupAttemptsPerDay: Number(loadedConfig.signupAttemptsPerDay) || defaultRateLimitConfig.signupAttemptsPerDay,
    };
  } catch (error) {
    console.error(`[Rate Limit Action] Error reading rate-limit-config.csv, returning defaults: ${(error as Error).message}`);
    return { ...defaultRateLimitConfig };
  }
}

export async function saveRateLimitConfig(config: RateLimitConfig): Promise<{ success: boolean; message: string }> {
  console.log('[Rate Limit Action] Attempting to save rate limit config CSV.');
  const configToSave = {
    otpRequestsPerHour: Number(config.otpRequestsPerHour) || 0,
    otpRequestsPerDay: Number(config.otpRequestsPerDay) || 0,
    signupAttemptsPerHour: Number(config.signupAttemptsPerHour) || 0,
    signupAttemptsPerDay: Number(config.signupAttemptsPerDay) || 0,
  };
  const headers = RATE_LIMIT_CONFIG_HEADERS.trim().split(',');
  const result = await overwriteCsvFile(rateLimitConfigCsvPath, [configToSave], headers);
  return { success: result.success, message: result.message };
}

export async function downloadRateLimitConfigCsv(): Promise<string> {
  try {
    const config = await getRateLimitConfig();
    const headers = RATE_LIMIT_CONFIG_HEADERS.trim().split(',');
    return Papa.unparse([config], { header: true, columns: headers });
  } catch (error) {
    console.error(`[Rate Limit Action] Error generating RateLimitConfig CSV for download: ${(error as Error).message}`);
    return RATE_LIMIT_CONFIG_HEADERS;
  }
}

export async function uploadRateLimitConfigCsv(csvString: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = Papa.parse<any>(csvString, {
      header: true,
      dynamicTyping: true, 
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
        const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
        return { success: false, message: `CSV parsing errors: ${errorMessages}` };
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

    return saveRateLimitConfig(configToSave);
  } catch (error) {
    console.error(`[Rate Limit Action] Error processing RateLimitConfig CSV upload: ${(error as Error).message}`);
    return { success: false, message: `Error processing CSV: ${(error as Error).message}` };
  }
}
