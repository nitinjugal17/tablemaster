// src/app/actions/data-management/mongodb/stock-item-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { StockItem } from '@/lib/types';
import Papa from 'papaparse';
import { STOCK_ITEMS_HEADERS } from '../_csv-headers';
import { ALL_STOCK_UNITS } from '@/lib/types';

export async function getStockItems(): Promise<StockItem[]> {
  const { db } = await connectToDatabase();
  const items = await db.collection('stock-items').find({}).toArray();
  return items.map(fromMongo) as StockItem[];
}

export async function saveStockItems(items: StockItem[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('stock-items').deleteMany({});
        if (items.length > 0) {
            const itemsWithObjectIds = items.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                lastPurchaseDate: rest.lastPurchaseDate ? new Date(rest.lastPurchaseDate) : undefined,
            }));
            const result = await db.collection('stock-items').insertMany(itemsWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} stock items.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all stock items.', count: 0 };
    } catch (error) {
        console.error("Error saving stock items to MongoDB:", error);
        return { success: false, message: `Error saving stock items to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadStockItemsCsv(): Promise<string> {
    const items = await getStockItems();
    if (items.length === 0) return STOCK_ITEMS_HEADERS;
    const dataForCsv = items.map(item => ({
        ...item,
        lastPurchaseDate: item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toISOString().split('T')[0] : '',
    }));
    return Papa.unparse(dataForCsv, { header: true, columns: STOCK_ITEMS_HEADERS.trim().split(',') });
}

export async function uploadStockItemsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedData: StockItem[] = parsed.data.map(item => ({
        id: String(item.id || crypto.randomUUID()),
        name: String(item.name || 'Unnamed Stock Item'),
        category: String(item.category || 'Uncategorized'),
        unit: ALL_STOCK_UNITS.includes(item.unit) ? item.unit : 'pcs',
        currentStock: Number(item.currentStock) || 0,
        reorderLevel: Number(item.reorderLevel) || 0,
        supplier: String(item.supplier || ''),
        purchasePrice: parseFloat(String(item.purchasePrice)) || 0,
        lastPurchaseDate: item.lastPurchaseDate && new Date(item.lastPurchaseDate).toString() !== 'Invalid Date' ? new Date(item.lastPurchaseDate).toISOString() : undefined,
    }));
    return saveStockItems(validatedData);
}
