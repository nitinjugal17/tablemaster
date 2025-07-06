// src/app/actions/data-management/mongodb/offer-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { Offer } from '@/lib/types';
import { ALL_OFFER_TYPES } from '@/lib/types';
import Papa from 'papaparse';
import { OFFERS_HEADERS } from '../_csv-headers';
import type { WithId } from 'mongodb';


export async function getOffers(): Promise<Offer[]> {
  const { db } = await connectToDatabase();
  const offersFromDb = await db.collection('offers').find({}).toArray();
  const offers = offersFromDb.map(fromMongo);
  
  // Convert the 'details' object from BSON back to a JSON string to match the shared Offer type.
  return offers.map(o => ({
      ...o,
      details: (typeof o.details === 'object' && o.details !== null) ? JSON.stringify(o.details) : (o.details || '{}'),
  })) as Offer[];
}

export async function saveOffers(offers: Offer[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('offers').deleteMany({});
        if (offers.length > 0) {
            const offersWithObjectIds = offers.map(({ id, ...rest }) => {
                let parsedDetails = {};
                try {
                    // The details field from the Offer[] type is a string. Parse it before DB insertion.
                    if (rest.details && typeof rest.details === 'string') {
                        parsedDetails = JSON.parse(rest.details);
                    }
                } catch (e) {
                    console.warn(`Invalid JSON for offer details, storing as empty object. Offer ID: ${id}`);
                }
                return {
                    ...rest,
                    details: parsedDetails, // Store the parsed object in MongoDB
                    _id: toObjectId(id),
                    validFrom: new Date(rest.validFrom),
                    validTo: new Date(rest.validTo),
                };
            });
            const result = await db.collection('offers').insertMany(offersWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} offers.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all offers.', count: 0 };
    } catch (error) {
        console.error("Error saving offers to MongoDB:", error);
        return { success: false, message: `Error saving offers to MongoDB: ${(error as Error).message}` };
    }
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
        details: o.details, // details is already a string from getOffers()
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
