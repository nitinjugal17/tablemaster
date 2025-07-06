// src/app/actions/data-management/csv/room-stock-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { ROOM_STOCK_ITEMS_HEADERS } from '../_csv-headers';
import type { RoomStockItem } from '@/lib/types';

const roomStockCsvPath = path.join(dataDir, 'room-stock-items.csv');

export async function getRoomStock(roomId?: string): Promise<RoomStockItem[]> {
  const allStock = await readCsvFile<any>(roomStockCsvPath, ROOM_STOCK_ITEMS_HEADERS);
  const data = allStock.map(item => ({
    id: String(item.id || `${item.roomId}-${item.menuItemId}`),
    roomId: String(item.roomId),
    menuItemId: String(item.menuItemId),
    stockQuantity: Number(item.stockQuantity) || 0,
  }));
  if (roomId) {
    return data.filter(item => item.roomId === roomId);
  }
  return data;
}

export async function saveRoomStock(roomId: string, stockItems: RoomStockItem[]): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const allStock = await getRoomStock();
    const otherRoomsStock = allStock.filter(item => item.roomId !== roomId);
    const updatedStock = [...otherRoomsStock, ...stockItems];
    
    const dataForCsv = updatedStock.map(item => ({
        id: item.id || `${item.roomId}-${item.menuItemId}`,
        roomId: item.roomId,
        menuItemId: item.menuItemId,
        stockQuantity: item.stockQuantity,
    }));
    
    const csvHeaders = ROOM_STOCK_ITEMS_HEADERS.trim().split(',');
    return overwriteCsvFile(roomStockCsvPath, dataForCsv, csvHeaders);
  } catch (error) {
    console.error(`[Room Stock CSV Action] Error saving stock for room ${roomId}:`, error);
    return { success: false, message: `Failed to save room stock: ${(error as Error).message}`};
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

    const allStock = await getRoomStock();
    const roomIdsInUpload = new Set(validatedData.map(item => item.roomId));
    const stockNotInUpload = allStock.filter(item => !roomIdsInUpload.has(item.roomId));
    const finalStockList = [...stockNotInUpload, ...validatedData];

    return overwriteCsvFile(roomStockCsvPath, finalStockList, ROOM_STOCK_ITEMS_HEADERS.trim().split(','));
}
