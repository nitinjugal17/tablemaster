
// src/app/actions/data-management/banner-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { BANNERS_HEADERS } from '../_csv-headers';
import type { Banner } from '@/lib/types';

const bannersCsvPath = path.join(dataDir, 'banners.csv');

export async function getBanners(): Promise<Banner[]> {
  const rawData = await readCsvFile<any>(bannersCsvPath, BANNERS_HEADERS);
  return rawData.map(banner => ({
    id: String(banner.id || crypto.randomUUID()),
    title: banner.title || "Untitled Banner",
    imageUrl: banner.imageUrl || 'https://placehold.co/1200x300.png?text=Banner',
    aiHint: banner.aiHint || undefined,
    linkUrl: banner.linkUrl || undefined,
    displayOrder: Number(banner.displayOrder) || 0,
    isActive: String(banner.isActive).toLowerCase() === 'true',
    validFrom: banner.validFrom && new Date(banner.validFrom).toString() !== 'Invalid Date' ? new Date(banner.validFrom).toISOString() : undefined,
    validTo: banner.validTo && new Date(banner.validTo).toString() !== 'Invalid Date' ? new Date(banner.validTo).toISOString() : undefined,
  }));
}

export async function saveBanners(banners: Banner[]): Promise<{ success: boolean; message: string; count?: number }> {
  const csvHeaders = BANNERS_HEADERS.trim().split(',');
   const dataForCsv = banners.map(b => ({
    id: String(b.id || crypto.randomUUID()),
    title: b.title || "Untitled Banner",
    imageUrl: b.imageUrl || 'https://placehold.co/1200x300.png?text=Promotional+Banner',
    aiHint: b.aiHint || "",
    linkUrl: b.linkUrl || "",
    displayOrder: Number(b.displayOrder) || 0,
    isActive: String(b.isActive).toLowerCase() === 'true',
    validFrom: b.validFrom ? new Date(b.validFrom).toISOString().split('T')[0] : "", // Save only date part for CSV if needed, or full ISO
    validTo: b.validTo ? new Date(b.validTo).toISOString().split('T')[0] : "",
  }));
  return overwriteCsvFile(bannersCsvPath, dataForCsv, csvHeaders);
}

export async function downloadBannersCsv(): Promise<string> {
  const items = await getBanners();
  if (items.length === 0) return BANNERS_HEADERS;
   const dataForCsv = items.map(b => ({
    id: String(b.id || crypto.randomUUID()),
    title: b.title || "Untitled Banner",
    imageUrl: b.imageUrl || 'https://placehold.co/1200x300.png?text=Promotional+Banner',
    aiHint: b.aiHint || "",
    linkUrl: b.linkUrl || "",
    displayOrder: Number(b.displayOrder) || 0,
    isActive: String(b.isActive).toLowerCase() === 'true',
    validFrom: b.validFrom ? new Date(b.validFrom).toISOString().split('T')[0] : "",
    validTo: b.validTo ? new Date(b.validTo).toISOString().split('T')[0] : "",
  }));
  return Papa.unparse(dataForCsv, { header: true, columns: BANNERS_HEADERS.trim().split(',') });
}

export async function uploadBannersCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
    return { success: false, message: `CSV parsing errors: ${errorMessages}` };
  }
  
  let validatedData: Banner[];
  try {
    validatedData = parsed.data.map((b, index) => {
        if (!b.title || !b.imageUrl) {
            throw new Error(`Row ${index + 2}: Title and Image URL are required for banner.`);
        }
        return {
            id: String(b.id || crypto.randomUUID()),
            title: b.title,
            imageUrl: b.imageUrl,
            aiHint: b.aiHint || undefined,
            linkUrl: b.linkUrl || undefined,
            displayOrder: Number(b.displayOrder) || 0,
            isActive: String(b.isActive).toLowerCase() === 'true',
            validFrom: b.validFrom && new Date(b.validFrom).toString() !== 'Invalid Date' ? new Date(b.validFrom).toISOString() : undefined,
            validTo: b.validTo && new Date(b.validTo).toString() !== 'Invalid Date' ? new Date(b.validTo).toISOString() : undefined,
        };
    });
  } catch (validationError) {
      return { success: false, message: (validationError as Error).message + " File not saved."};
  }
  return saveBanners(validatedData);
}
