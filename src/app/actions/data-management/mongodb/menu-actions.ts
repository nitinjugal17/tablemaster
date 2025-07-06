// src/app/actions/data-management/mongodb/menu-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { Menu } from '@/lib/types';
import Papa from 'papaparse';
import { MENUS_HEADERS } from '../_csv-headers';

export async function getMenus(): Promise<Menu[]> {
  const { db } = await connectToDatabase();
  const menus = await db.collection('menus').find({}).toArray();
  return menus.map(fromMongo) as Menu[];
}

export async function saveMenus(menus: Menu[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('menus').deleteMany({});
        if (menus.length > 0) {
            const menusWithObjectIds = menus.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
            }));
            const result = await db.collection('menus').insertMany(menusWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} menus.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all menus.', count: 0 };
    } catch (error) {
        console.error("Error saving menus to MongoDB:", error);
        return { success: false, message: `Error saving menus to MongoDB: ${(error as Error).message}` };
    }
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
