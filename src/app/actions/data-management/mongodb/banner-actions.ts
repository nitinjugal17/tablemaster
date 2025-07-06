// src/app/actions/data-management/mongodb/banner-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { Banner } from '@/lib/types';
import Papa from 'papaparse';
import { BANNERS_HEADERS } from '../_csv-headers';

export async function getBanners(): Promise<Banner[]> {
  const { db } = await connectToDatabase();
  const banners = await db.collection('banners').find({}).toArray();
  return banners.map(fromMongo) as Banner[];
}

export async function saveBanners(banners: Banner[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('banners').deleteMany({});
        if (banners.length > 0) {
            const bannersWithObjectIds = banners.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                validFrom: rest.validFrom ? new Date(rest.validFrom) : undefined,
                validTo: rest.validTo ? new Date(rest.validTo) : undefined,
            }));
            const result = await db.collection('banners').insertMany(bannersWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} banners.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all banners.', count: 0 };
    } catch (error) {
        console.error("Error saving banners to MongoDB:", error);
        return { success: false, message: `Error saving banners to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadBannersCsv(): Promise<string> {
  const items = await getBanners();
  if (items.length === 0) return BANNERS_HEADERS;
  const dataForCsv = items.map(b => ({
    id: b.id,
    title: b.title,
    imageUrl: b.imageUrl,
    aiHint: b.aiHint || "",
    linkUrl: b.linkUrl || "",
    displayOrder: b.displayOrder,
    isActive: b.isActive,
    validFrom: b.validFrom ? new Date(b.validFrom).toISOString().split('T')[0] : "",
    validTo: b.validTo ? new Date(b.validTo).toISOString().split('T')[0] : "",
  }));
  return Papa.unparse(dataForCsv, { header: true, columns: BANNERS_HEADERS.trim().split(',') });
}

export async function uploadBannersCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
  }
  const validatedData: Banner[] = parsed.data.map(b => ({
      id: String(b.id || crypto.randomUUID()),
      title: b.title,
      imageUrl: b.imageUrl,
      aiHint: b.aiHint || undefined,
      linkUrl: b.linkUrl || undefined,
      displayOrder: Number(b.displayOrder) || 0,
      isActive: String(b.isActive).toLowerCase() === 'true',
      validFrom: b.validFrom && new Date(b.validFrom).toString() !== 'Invalid Date' ? new Date(b.validFrom).toISOString() : undefined,
      validTo: b.validTo && new Date(b.validTo).toString() !== 'Invalid Date' ? new Date(b.validTo).toISOString() : undefined,
  }));
  return saveBanners(validatedData);
}
