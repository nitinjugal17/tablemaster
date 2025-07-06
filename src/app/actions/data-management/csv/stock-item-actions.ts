// src/app/actions/data-management/stock-item-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { STOCK_ITEMS_HEADERS } from '../_csv-headers';
import type { StockItem } from '@/lib/types';
import { ALL_STOCK_UNITS } from '@/lib/types';

const stockItemsCsvPath = path.join(dataDir, 'stock-items.csv');

export async function getStockItems(): Promise<StockItem[]> {
  const rawData = await readCsvFile<any>(stockItemsCsvPath, STOCK_ITEMS_HEADERS);
  return rawData.map(item => ({
    id: String(item.id || crypto.randomUUID()),
    name: item.name || 'Unnamed Stock Item',
    category: item.category || 'Uncategorized',
    unit: ALL_STOCK_UNITS.includes(item.unit) ? item.unit : 'pcs',
    currentStock: Number(item.currentStock) || 0,
    reorderLevel: Number(item.reorderLevel) || 0,
    supplier: item.supplier || '',
    purchasePrice: parseFloat(String(item.purchasePrice)) || 0,
    lastPurchaseDate: item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toISOString() : undefined,
  }));
}

export async function saveStockItems(items: StockItem[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = items.map(item => ({
      ...item,
      currentStock: Number(item.currentStock) || 0,
      reorderLevel: Number(item.reorderLevel) || 0,
      purchasePrice: Number(item.purchasePrice) || 0,
      lastPurchaseDate: item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toISOString().split('T')[0] : '', 
  }));
  const csvHeaders = STOCK_ITEMS_HEADERS.trim().split(',');
  return overwriteCsvFile(stockItemsCsvPath, dataForCsv, csvHeaders);
}

export async function downloadStockItemsCsv(): Promise<string> {
  const items = await getStockItems();
  if (items.length === 0) return STOCK_ITEMS_HEADERS;
  const dataForCsv = items.map(item => ({
      ...item,
      lastPurchaseDate: item.lastPurchaseDate ? new Date(item.lastPurchaseDate).toISOString().split('T')[0] : '',
  }));
  const csvHeaders = STOCK_ITEMS_HEADERS.trim().split(',');
  return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
}

export async function uploadStockItemsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
    return { success: false, message: `CSV parsing errors: ${errorMessages}` };
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
