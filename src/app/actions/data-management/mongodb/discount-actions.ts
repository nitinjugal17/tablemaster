// src/app/actions/data-management/mongodb/discount-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { DiscountCode, DiscountCodeType } from '@/lib/types';
import Papa from 'papaparse';
import { DISCOUNTS_HEADERS } from '../_csv-headers';

export async function getDiscounts(): Promise<DiscountCode[]> {
  const { db } = await connectToDatabase();
  const discounts = await db.collection('discounts').find({}).toArray();
  return discounts.map(fromMongo) as DiscountCode[];
}

export async function saveDiscounts(discounts: DiscountCode[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('discounts').deleteMany({});
        if (discounts.length > 0) {
            const discountsWithObjectIds = discounts.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                validFrom: new Date(rest.validFrom),
                validTo: new Date(rest.validTo),
            }));
            const result = await db.collection('discounts').insertMany(discountsWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} discount codes.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all discount codes.', count: 0 };
    } catch (error) {
        console.error("Error saving discount codes to MongoDB:", error);
        return { success: false, message: `Error saving discount codes to MongoDB: ${(error as Error).message}` };
    }
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
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
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
