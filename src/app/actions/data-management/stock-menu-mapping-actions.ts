
// src/app/actions/data-management/stock-menu-mapping-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from './_csv-base-actions';
import { STOCK_MENU_MAPPINGS_HEADERS } from './_csv-headers';
import type { StockMenuMapping } from '@/lib/types';
import { ALL_STOCK_UNITS } from '@/lib/types';

const stockMenuMappingsCsvPath = path.join(dataDir, 'stock-menu-mappings.csv');

export async function getStockMenuMappings(): Promise<StockMenuMapping[]> {
  const rawData = await readCsvFile<any>(stockMenuMappingsCsvPath, STOCK_MENU_MAPPINGS_HEADERS);
  return rawData.map(mapping => ({
    id: String(mapping.id || crypto.randomUUID()),
    stockItemId: String(mapping.stockItemId),
    menuItemId: String(mapping.menuItemId),
    quantityUsedPerServing: parseFloat(String(mapping.quantityUsedPerServing)) || 0,
    unitUsed: ALL_STOCK_UNITS.includes(mapping.unitUsed) ? mapping.unitUsed : 'pcs',
  }));
}

export async function saveStockMenuMappings(mappings: StockMenuMapping[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = mappings.map(m => ({
    id: String(m.id || crypto.randomUUID()),
    stockItemId: String(m.stockItemId),
    menuItemId: String(m.menuItemId),
    quantityUsedPerServing: parseFloat(String(m.quantityUsedPerServing)) || 0,
    unitUsed: ALL_STOCK_UNITS.includes(m.unitUsed) ? m.unitUsed : 'pcs',
  }));
  const csvHeaders = STOCK_MENU_MAPPINGS_HEADERS.trim().split(',');
  return overwriteCsvFile(stockMenuMappingsCsvPath, dataForCsv, csvHeaders);
}

export async function downloadStockMenuMappingsCsv(): Promise<string> {
  const items = await getStockMenuMappings();
  if (items.length === 0) return STOCK_MENU_MAPPINGS_HEADERS;
  const csvHeaders = STOCK_MENU_MAPPINGS_HEADERS.trim().split(',');
  return Papa.unparse(items, { header: true, columns: csvHeaders });
}

export async function uploadStockMenuMappingsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
    return { success: false, message: `CSV parsing errors: ${errorMessages}` };
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
