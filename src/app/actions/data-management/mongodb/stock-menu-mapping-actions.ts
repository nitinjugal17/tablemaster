// src/app/actions/data-management/mongodb/stock-menu-mapping-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { StockMenuMapping } from '@/lib/types';
import Papa from 'papaparse';
import { STOCK_MENU_MAPPINGS_HEADERS } from '../_csv-headers';
import { ALL_STOCK_UNITS } from '@/lib/types';

export async function getStockMenuMappings(): Promise<StockMenuMapping[]> {
  const { db } = await connectToDatabase();
  const mappings = await db.collection('stock-menu-mappings').find({}).toArray();
  return mappings.map(fromMongo) as StockMenuMapping[];
}

export async function saveStockMenuMappings(mappings: StockMenuMapping[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('stock-menu-mappings').deleteMany({});
        if (mappings.length > 0) {
            const mappingsWithObjectIds = mappings.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
            }));
            const result = await db.collection('stock-menu-mappings').insertMany(mappingsWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} mappings.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all mappings.', count: 0 };
    } catch (error) {
        console.error("Error saving mappings to MongoDB:", error);
        return { success: false, message: `Error saving mappings to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadStockMenuMappingsCsv(): Promise<string> {
    const items = await getStockMenuMappings();
    if (items.length === 0) return STOCK_MENU_MAPPINGS_HEADERS;
    return Papa.unparse(items, { header: true, columns: STOCK_MENU_MAPPINGS_HEADERS.trim().split(',') });
}

export async function uploadStockMenuMappingsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedData: StockMenuMapping[] = parsed.data.map(mapping => {
        if (!mapping.stockItemId || !mapping.menuItemId) {
            throw new Error("Stock Item ID and Menu Item ID are required for each mapping.");
        }
        return {
            id: String(mapping.id || crypto.randomUUID()),
            stockItemId: String(mapping.stockItemId),
            menuItemId: String(mapping.menuItemId),
            quantityUsedPerServing: parseFloat(String(mapping.quantityUsedPerServing)) || 0,
            unitUsed: ALL_STOCK_UNITS.includes(mapping.unitUsed) ? mapping.unitUsed : 'pcs',
        };
    });
    return saveStockMenuMappings(validatedData);
}
