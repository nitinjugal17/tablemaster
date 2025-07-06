// src/app/actions/data-management/discount-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { DISCOUNTS_HEADERS } from '../_csv-headers';
import type { DiscountCode, DiscountCodeType } from '@/lib/types';

const discountsCsvPath = path.join(dataDir, 'discounts.csv');

export async function getDiscounts(): Promise<DiscountCode[]> {
  const rawData = await readCsvFile<any>(discountsCsvPath, DISCOUNTS_HEADERS);
  return rawData.map(discount => ({
    id: String(discount.id || crypto.randomUUID()),
    code: String(discount.code || `CODE${Math.floor(Math.random()*10000)}`),
    type: discount.type === 'percentage' || discount.type === 'fixed_amount' ? discount.type : 'percentage',
    value: parseFloat(String(discount.value)) || 0,
    imageUrl: discount.imageUrl || undefined,
    aiHint: discount.aiHint || undefined,
    validFrom: discount.validFrom ? new Date(discount.validFrom).toISOString() : new Date().toISOString(),
    validTo: discount.validTo ? new Date(discount.validTo).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    usageLimit: parseInt(String(discount.usageLimit), 10) || 0,
    timesUsed: parseInt(String(discount.timesUsed), 10) || 0,
    minOrderAmount: parseFloat(String(discount.minOrderAmount)) || 0,
    isActive: String(discount.isActive).toLowerCase() === 'true',
    description: discount.description || '',
  }));
}

export async function saveDiscounts(discounts: DiscountCode[]): Promise<{ success: boolean; message: string; count?: number }> {
  const csvHeaders = DISCOUNTS_HEADERS.trim().split(',');
  const dataForCsv = discounts.map(d => ({
    id: String(d.id || crypto.randomUUID()),
    code: String(d.code || `CODE${Math.floor(Math.random()*10000)}`),
    type: d.type === 'fixed_amount' || d.type === 'percentage' ? d.type : 'percentage',
    value: Number(d.value) || 0,
    imageUrl: d.imageUrl || "",
    aiHint: d.aiHint || "",
    validFrom: d.validFrom ? new Date(d.validFrom).toISOString() : new Date().toISOString(),
    validTo: d.validTo ? new Date(d.validTo).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    usageLimit: Number(d.usageLimit) || 0,
    timesUsed: Number(d.timesUsed) || 0,
    minOrderAmount: Number(d.minOrderAmount) || 0,
    isActive: String(d.isActive).toLowerCase() === 'true',
    description: d.description || '',
  }));
  return overwriteCsvFile(discountsCsvPath, dataForCsv, csvHeaders);
}

export async function downloadDiscountsCsv(): Promise<string> {
  const items = await getDiscounts();
  if (items.length === 0) return DISCOUNTS_HEADERS;
  const dataForCsv = items.map(d => ({
    ...d,
    isActive: String(d.isActive),
    validFrom: d.validFrom ? new Date(d.validFrom).toISOString() : '',
    validTo: d.validTo ? new Date(d.validTo).toISOString() : '',
    imageUrl: d.imageUrl || '',
    aiHint: d.aiHint || '',
  }));
  return Papa.unparse(dataForCsv, { header: true, columns: DISCOUNTS_HEADERS.trim().split(',') });
}

export async function uploadDiscountsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
    return { success: false, message: `CSV parsing errors: ${errorMessages}` };
  }
  const validatedData = parsed.data.map(d => ({
      id: String(d.id || crypto.randomUUID()),
      code: String(d.code || `D${Date.now()}`),
      type: (d.type === 'fixed_amount' || d.type === 'percentage') ? d.type : 'percentage' as DiscountCodeType,
      value: parseFloat(String(d.value)) || 0,
      imageUrl: d.imageUrl || undefined,
      aiHint: d.aiHint || undefined,
      validFrom: d.validFrom && new Date(d.validFrom).toString() !== 'Invalid Date' ? new Date(d.validFrom).toISOString() : new Date().toISOString(),
      validTo: d.validTo && new Date(d.validTo).toString() !== 'Invalid Date' ? new Date(d.validTo).toISOString() : new Date(Date.now() + 365*24*60*60*1000).toISOString(),
      usageLimit: parseInt(String(d.usageLimit), 10) || 0,
      timesUsed: parseInt(String(d.timesUsed), 10) || 0,
      minOrderAmount: parseFloat(String(d.minOrderAmount)) || 0,
      isActive: String(d.isActive).toLowerCase() === 'true',
      description: d.description || '',
  }));
  return saveDiscounts(validatedData);
}
