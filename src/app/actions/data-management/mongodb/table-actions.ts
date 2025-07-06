// src/app/actions/data-management/mongodb/table-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { RestaurantTable } from '@/lib/types';
import Papa from 'papaparse';
import { RESTAURANT_TABLES_HEADERS } from '../_csv-headers';
import { ALL_TABLE_STATUSES } from '@/lib/types';

export async function getRestaurantTables(): Promise<RestaurantTable[]> {
  const { db } = await connectToDatabase();
  const tables = await db.collection('restaurant-tables').find({}).toArray();
  return tables.map(fromMongo) as RestaurantTable[];
}

export async function saveRestaurantTables(tables: RestaurantTable[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('restaurant-tables').deleteMany({});
        if (tables.length > 0) {
            const tablesWithObjectIds = tables.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
            }));
            const result = await db.collection('restaurant-tables').insertMany(tablesWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} tables.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all tables.', count: 0 };
    } catch (error) {
        console.error("Error saving tables to MongoDB:", error);
        return { success: false, message: `Error saving tables to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadRestaurantTablesCsv(): Promise<string> {
    const tables = await getRestaurantTables();
    if (tables.length === 0) return RESTAURANT_TABLES_HEADERS;
    return Papa.unparse(tables, { header: true, columns: RESTAURANT_TABLES_HEADERS.trim().split(',') });
}

export async function uploadRestaurantTablesCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<RestaurantTable>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedTables: RestaurantTable[] = parsed.data.map(table => ({
        id: String(table.id || crypto.randomUUID()),
        name: table.name || 'Unnamed Table',
        capacity: Number(table.capacity) || 0,
        status: ALL_TABLE_STATUSES.includes(table.status) ? table.status : 'Maintenance',
        notes: table.notes || '',
    }));
    return saveRestaurantTables(validatedTables);
}
