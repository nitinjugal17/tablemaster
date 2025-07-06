// src/app/actions/data-management/image-management-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { MANAGED_IMAGES_HEADERS } from '../_csv-headers';
import type { ManagedImage } from '@/lib/types';
import { ALL_MANAGED_IMAGE_CONTEXTS } from '@/lib/types';

const managedImagesCsvPath = path.join(dataDir, 'managed-images.csv');

export async function getManagedImages(): Promise<ManagedImage[]> {
  const rawData = await readCsvFile<any>(managedImagesCsvPath, MANAGED_IMAGES_HEADERS);
  return rawData.map(image => ({
    id: String(image.id || crypto.randomUUID()),
    context: ALL_MANAGED_IMAGE_CONTEXTS.includes(image.context) ? image.context : 'general_ui_other',
    entityId: image.entityId || undefined,
    imageUrl: image.imageUrl || 'https://placehold.co/300x200.png?text=Managed+Image',
    aiPromptUsed: image.aiPromptUsed || undefined,
    aiHint: image.aiHint || undefined,
    altText: image.altText || undefined,
    uploadedAt: image.uploadedAt ? new Date(image.uploadedAt).toISOString() : new Date().toISOString(),
  }));
}

export async function saveManagedImages(images: ManagedImage[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = images.map(image => ({
    id: String(image.id || crypto.randomUUID()),
    context: ALL_MANAGED_IMAGE_CONTEXTS.includes(image.context) ? image.context : 'general_ui_other',
    entityId: image.entityId || '',
    imageUrl: image.imageUrl || 'https://placehold.co/300x200.png?text=Image',
    aiPromptUsed: image.aiPromptUsed || '',
    aiHint: image.aiHint || '',
    altText: image.altText || '',
    uploadedAt: image.uploadedAt ? new Date(image.uploadedAt).toISOString() : new Date().toISOString(),
  }));
  const csvHeaders = MANAGED_IMAGES_HEADERS.trim().split(',');
  return overwriteCsvFile(managedImagesCsvPath, dataForCsv, csvHeaders);
}

export async function downloadManagedImagesCsv(): Promise<string> {
  const items = await getManagedImages();
  if (items.length === 0) return MANAGED_IMAGES_HEADERS;
  const dataForCsv = items.map(image => ({
    ...image,
    uploadedAt: image.uploadedAt ? new Date(image.uploadedAt).toISOString() : new Date().toISOString(),
  }));
  return Papa.unparse(dataForCsv, { header: true, columns: MANAGED_IMAGES_HEADERS.trim().split(',') });
}

export async function uploadManagedImagesCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
    return { success: false, message: `CSV parsing errors: ${errorMessages}` };
  }
  const validatedData = parsed.data.map(img => ({
      id: String(img.id || crypto.randomUUID()),
      context: ALL_MANAGED_IMAGE_CONTEXTS.includes(img.context) ? img.context : 'general_ui_other',
      entityId: img.entityId || undefined,
      imageUrl: img.imageUrl || 'https://placehold.co/300x200.png?text=Image',
      aiPromptUsed: img.aiPromptUsed || undefined,
      aiHint: img.aiHint || undefined,
      altText: img.altText || undefined,
      uploadedAt: img.uploadedAt && new Date(img.uploadedAt).toString() !== "Invalid Date" ? new Date(img.uploadedAt).toISOString() : new Date().toISOString(),
  }));
  return saveManagedImages(validatedData);
}
