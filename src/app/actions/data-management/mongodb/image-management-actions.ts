// src/app/actions/data-management/mongodb/image-management-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { ManagedImage } from '@/lib/types';
import { ALL_MANAGED_IMAGE_CONTEXTS } from '@/lib/types';
import Papa from 'papaparse';
import { MANAGED_IMAGES_HEADERS } from '../_csv-headers';

export async function getManagedImages(): Promise<ManagedImage[]> {
  const { db } = await connectToDatabase();
  const images = await db.collection('managed-images').find({}).toArray();
  return images.map(fromMongo) as ManagedImage[];
}

export async function saveManagedImages(images: ManagedImage[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('managed-images').deleteMany({});
        if (images.length > 0) {
            const imagesWithObjectIds = images.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                uploadedAt: new Date(rest.uploadedAt),
            }));
            const result = await db.collection('managed-images').insertMany(imagesWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} image records.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all image records.', count: 0 };
    } catch (error) {
        console.error("Error saving image records to MongoDB:", error);
        return { success: false, message: `Error saving image records to MongoDB: ${(error as Error).message}` };
    }
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
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedData: ManagedImage[] = parsed.data.map(img => ({
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
