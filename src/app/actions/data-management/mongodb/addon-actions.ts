// src/app/actions/data-management/mongodb/addon-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { AddonGroup, Addon } from '@/lib/types';
import Papa from 'papaparse';
import { ADDON_GROUPS_HEADERS } from '../_csv-headers';
import type { WithId } from 'mongodb';


export async function getAddonGroups(): Promise<AddonGroup[]> {
  const { db } = await connectToDatabase();
  const addonGroups = await db.collection('addon-groups').find({}).toArray();
  return addonGroups.map(fromMongo) as AddonGroup[];
}

export async function saveAddonGroups(groups: AddonGroup[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('addon-groups').deleteMany({});
        if (groups.length > 0) {
            const groupsWithObjectIds = groups.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
            }));
            const result = await db.collection('addon-groups').insertMany(groupsWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} addon groups.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all addon groups.', count: 0 };
    } catch (error) {
        console.error("Error saving addon groups to MongoDB:", error);
        return { success: false, message: `Error saving addon groups to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadAddonGroupsCsv(): Promise<string> {
    const items = await getAddonGroups();
    if (items.length === 0) return ADDON_GROUPS_HEADERS;
    const dataForCsv = items.map(group => ({
        ...group,
        addons: JSON.stringify(group.addons),
    }));
    return Papa.unparse(dataForCsv, { header: true, columns: ADDON_GROUPS_HEADERS.trim().split(',') });
}

export async function uploadAddonGroupsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedData: AddonGroup[] = parsed.data.map(group => {
        let parsedAddons: Addon[] = [];
        if (typeof group.addons === 'string' && group.addons.trim() !== "") {
            try {
                parsedAddons = JSON.parse(group.addons);
                if (!Array.isArray(parsedAddons)) parsedAddons = [];
            } catch (e) {
                parsedAddons = [];
            }
        }
        return {
            id: String(group.id || crypto.randomUUID()),
            name: group.name || 'Unnamed Add-on Group',
            description: group.description || undefined,
            addons: parsedAddons,
        };
    });
    return saveAddonGroups(validatedData);
}
