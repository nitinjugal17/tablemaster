// src/app/actions/data-management/table-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from './_csv-base-actions';
import { RESTAURANT_TABLES_HEADERS } from './_csv-headers';
import type { RestaurantTable } from '@/lib/types';
import { ALL_TABLE_STATUSES } from '@/lib/types';

const restaurantTablesCsvPath = path.join(dataDir, 'restaurant-tables.csv');

export async function getRestaurantTables(): Promise<RestaurantTable[]> {
  const rawData = await readCsvFile<any>(restaurantTablesCsvPath, RESTAURANT_TABLES_HEADERS);
  return rawData.map(table => ({
    id: String(table.id || crypto.randomUUID()),
    name: table.name || 'Unnamed Table',
    capacity: Number(table.capacity) || 0,
    status: ALL_TABLE_STATUSES.includes(table.status) ? table.status : 'Maintenance',
    notes: table.notes || '',
  }));
}

export async function saveRestaurantTables(tables: RestaurantTable[]): Promise<{ success: boolean; message: string; count?: number }> {
  console.log('[Table Action] Attempting to save restaurant tables CSV.');
  const dataForCsv = tables.map(table => ({
    id: String(table.id || crypto.randomUUID()),
    name: table.name || 'Unnamed Table',
    capacity: Number(table.capacity) || 0,
    status: ALL_TABLE_STATUSES.includes(table.status) ? table.status : 'Maintenance',
    notes: table.notes || '',
  }));
  const csvHeaders = RESTAURANT_TABLES_HEADERS.trim().split(',');
  return overwriteCsvFile(restaurantTablesCsvPath, dataForCsv, csvHeaders);
}

export async function downloadRestaurantTablesCsv(): Promise<string> {
  try {
    const tables = await getRestaurantTables();
    if (tables.length === 0) return RESTAURANT_TABLES_HEADERS;
    const csvHeaders = RESTAURANT_TABLES_HEADERS.trim().split(',');
    return Papa.unparse(tables, { header: true, columns: csvHeaders });
  } catch (error) {
    console.error(`[Table Action] Error generating RestaurantTables CSV for download: ${(error as Error).message}`);
    return RESTAURANT_TABLES_HEADERS;
  }
}

export async function uploadRestaurantTablesCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const parsed = Papa.parse<RestaurantTable>(csvString, {
      header: true,
      dynamicTyping: false, 
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
      return { success: false, message: `CSV parsing errors: ${errorMessages}. File not saved.` };
    }
    
    const validatedTables: RestaurantTable[] = parsed.data.map(table => ({
      id: String(table.id || crypto.randomUUID()),
      name: table.name || 'Unnamed Table',
      capacity: Number(table.capacity) || 0,
      status: ALL_TABLE_STATUSES.includes(table.status) ? table.status : 'Maintenance',
      notes: table.notes || '',
    }));

    return saveRestaurantTables(validatedTables);
  } catch (error) {
    console.error(`[Table Action] Error processing RestaurantTables CSV upload: ${(error as Error).message}`);
    return { success: false, message: `Error processing uploaded restaurant tables CSV: ${(error as Error).message}` };
  }
}
