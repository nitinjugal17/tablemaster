// src/app/actions/data-management/offer-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { OFFERS_HEADERS } from '../_csv-headers';
import type { Offer } from '@/lib/types';
import { ALL_OFFER_TYPES } from '@/lib/types';

const offersCsvPath = path.join(dataDir, 'offers.csv');

export async function getOffers(): Promise<Offer[]> {
  const rawData = await readCsvFile<any>(offersCsvPath, OFFERS_HEADERS);
  return rawData.map(offer => ({
    id: String(offer.id || crypto.randomUUID()),
    title: offer.title || "Untitled Offer",
    description: offer.description || undefined,
    type: ALL_OFFER_TYPES.includes(offer.type) ? offer.type : 'seasonal_special',
    details: typeof offer.details === 'string' ? offer.details : '{}',
    imageUrl: offer.imageUrl || undefined,
    aiHint: offer.aiHint || undefined,
    isActive: String(offer.isActive).toLowerCase() === 'true',
    validFrom: offer.validFrom ? new Date(offer.validFrom).toISOString() : new Date().toISOString(),
    validTo: offer.validTo ? new Date(offer.validTo).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    linkedMenuItemIds: offer.linkedMenuItemIds || undefined,
  }));
}

export async function saveOffers(offers: Offer[]): Promise<{ success: boolean; message: string; count?: number }> {
  const csvHeaders = OFFERS_HEADERS.trim().split(',');
  const dataForCsv = offers.map(o => ({
    ...o,
    id: String(o.id || crypto.randomUUID()),
    title: o.title || "Untitled Offer",
    type: ALL_OFFER_TYPES.includes(o.type) ? o.type : 'seasonal_special',
    details: typeof o.details === 'string' ? o.details : '{}',
    imageUrl: o.imageUrl || '',
    aiHint: o.aiHint || '',
    isActive: String(o.isActive).toLowerCase() === 'true',
    validFrom: o.validFrom ? new Date(o.validFrom).toISOString() : new Date().toISOString(),
    validTo: o.validTo ? new Date(o.validTo).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    linkedMenuItemIds: o.linkedMenuItemIds || "",
  }));
  return overwriteCsvFile(offersCsvPath, dataForCsv, csvHeaders);
}

export async function downloadOffersCsv(): Promise<string> {
  const items = await getOffers();
  if (items.length === 0) return OFFERS_HEADERS;
  const csvHeaders = OFFERS_HEADERS.trim().split(',');
  const dataForCsv = items.map(o => ({
    id: o.id,
    title: o.title,
    description: o.description || "",
    type: o.type,
    details: o.details,
    imageUrl: o.imageUrl || "",
    aiHint: o.aiHint || "",
    validFrom: o.validFrom ? new Date(o.validFrom).toISOString() : "",
    validTo: o.validTo ? new Date(o.validTo).toISOString() : "",
    isActive: String(o.isActive),
    linkedMenuItemIds: o.linkedMenuItemIds || "",
  }));
  return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
}

export async function uploadOffersCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
    return { success: false, message: `CSV parsing errors: ${errorMessages}` };
  }
  const validatedData: Offer[] = parsed.data.map(o => ({
      id: String(o.id || crypto.randomUUID()),
      title: o.title || 'Untitled Offer',
      description: o.description || undefined,
      type: ALL_OFFER_TYPES.includes(o.type) ? o.type : 'seasonal_special',
      details: typeof o.details === 'string' ? o.details : '{}',
      imageUrl: o.imageUrl || undefined,
      aiHint: o.aiHint || undefined,
      validFrom: o.validFrom && new Date(o.validFrom).toString() !== 'Invalid Date' ? new Date(o.validFrom).toISOString() : new Date().toISOString(),
      validTo: o.validTo && new Date(o.validTo).toString() !== 'Invalid Date' ? new Date(o.validTo).toISOString() : new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      isActive: String(o.isActive).toLowerCase() === 'true',
      linkedMenuItemIds: o.linkedMenuItemIds || undefined,
  }));
  return saveOffers(validatedData);
}
