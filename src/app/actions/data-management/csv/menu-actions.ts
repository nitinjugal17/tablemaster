// src/app/actions/data-management/csv/menu-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { MENUS_HEADERS } from '../_csv-headers';
import type { Menu } from '@/lib/types';

const menusCsvPath = path.join(dataDir, 'menus.csv');

export async function getMenus(): Promise<Menu[]> {
  const rawData = await readCsvFile<any>(menusCsvPath, MENUS_HEADERS);
  return rawData.map(menu => ({
    id: String(menu.id || crypto.randomUUID()),
    name: menu.name || 'Unnamed Menu',
    description: menu.description || undefined,
    isActive: String(menu.isActive).toLowerCase() === 'true',
    menuItemIds: typeof menu.menuItemIds === 'string' ? menu.menuItemIds.split(',').map((id: string) => id.trim()).filter(Boolean) : [],
  }));
}

export async function saveMenus(menus: Menu[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = menus.map(menu => ({
    ...menu,
    menuItemIds: menu.menuItemIds.join(','),
  }));
  const csvHeaders = MENUS_HEADERS.trim().split(',');
  return overwriteCsvFile(menusCsvPath, dataForCsv, csvHeaders);
}

export async function downloadMenusCsv(): Promise<string> {
    const items = await getMenus();
    if (items.length === 0) return MENUS_HEADERS;
    const dataForCsv = items.map(menu => ({
        ...menu,
        menuItemIds: menu.menuItemIds.join(','),
    }));
    return Papa.unparse(dataForCsv, { header: true, columns: MENUS_HEADERS.trim().split(',') });
}

export async function uploadMenusCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedData: Menu[] = parsed.data.map(menu => ({
        id: String(menu.id || crypto.randomUUID()),
        name: menu.name || 'Unnamed Menu',
        description: menu.description || undefined,
        isActive: String(menu.isActive).toLowerCase() === 'true',
        menuItemIds: typeof menu.menuItemIds === 'string' ? menu.menuItemIds.split(',').map((id: string) => id.trim()).filter(Boolean) : [],
    }));
    return saveMenus(validatedData);
}
