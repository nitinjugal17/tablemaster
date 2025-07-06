// src/app/actions/data-management/mongodb/room-stock-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { RoomStockItem } from '@/lib/types';
import Papa from 'papaparse';
import { ROOM_STOCK_ITEMS_HEADERS } from '../_csv-headers';

export async function getRoomStock(roomId?: string): Promise<RoomStockItem[]> {
  const { db } = await connectToDatabase();
  const query = roomId ? { roomId } : {};
  const stockItems = await db.collection('room-stock-items').find(query).toArray();
  return stockItems.map(fromMongo) as RoomStockItem[];
}

export async function saveRoomStock(roomId: string, stockItems: RoomStockItem[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        // Clear existing stock for this room
        await db.collection('room-stock-items').deleteMany({ roomId });

        if (stockItems.length > 0) {
            const itemsToInsert = stockItems.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
            }));
            const result = await db.collection('room-stock-items').insertMany(itemsToInsert as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} stock items for room ${roomId}.`, count: result.insertedCount };
        }
        return { success: true, message: `Successfully cleared stock for room ${roomId}.`, count: 0 };
    } catch (error) {
        console.error(`Error saving room stock to MongoDB for room ${roomId}:`, error);
        return { success: false, message: `Error saving room stock to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadRoomStockCsv(): Promise<string> {
    const items = await getRoomStock();
    if (items.length === 0) return ROOM_STOCK_ITEMS_HEADERS;
    return Papa.unparse(items, { header: true, columns: ROOM_STOCK_ITEMS_HEADERS.trim().split(',') });
}

export async function uploadRoomStockCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedData: RoomStockItem[] = parsed.data.map(item => {
        if (!item.roomId || !item.menuItemId) {
            throw new Error("roomId and menuItemId are required for each stock item.");
        }
        return {
            id: String(item.id || `${item.roomId}-${item.menuItemId}`),
            roomId: String(item.roomId),
            menuItemId: String(item.menuItemId),
            stockQuantity: Number(item.stockQuantity) || 0,
        };
    });

    // In MongoDB, we can replace all documents.
    const { db } = await connectToDatabase();
    await db.collection('room-stock-items').deleteMany({});
    if (validatedData.length > 0) {
        const itemsToInsert = validatedData.map(({ id, ...rest }) => ({
            ...rest,
            _id: toObjectId(id),
        }));
        await db.collection('room-stock-items').insertMany(itemsToInsert as any);
    }
    return { success: true, message: `Successfully uploaded and replaced ${validatedData.length} room stock items.`, count: validatedData.length };
}
