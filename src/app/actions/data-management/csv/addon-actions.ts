// src/app/actions/data-management/csv/addon-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { ADDON_GROUPS_HEADERS } from '../_csv-headers';
import type { AddonGroup, Addon } from '@/lib/types';

const addonGroupsCsvPath = path.join(dataDir, 'addon-groups.csv');

export async function getAddonGroups(): Promise<AddonGroup[]> {
  const rawData = await readCsvFile<any>(addonGroupsCsvPath, ADDON_GROUPS_HEADERS);
  return rawData.map(group => {
    let parsedAddons: Addon[] = [];
    if (typeof group.addons === 'string' && group.addons.trim() !== "") {
        try {
            parsedAddons = JSON.parse(group.addons);
            if (!Array.isArray(parsedAddons)) parsedAddons = [];
        } catch (e) {
            parsedAddons = [];
        }
    } else if (Array.isArray(group.addons)) {
        parsedAddons = group.addons;
    }
    return {
      id: String(group.id || crypto.randomUUID()),
      name: group.name || 'Unnamed Add-on Group',
      description: group.description || undefined,
      addons: parsedAddons,
    };
  });
}

export async function saveAddonGroups(groups: AddonGroup[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = groups.map(group => ({
    ...group,
    addons: JSON.stringify(group.addons),
  }));
  const csvHeaders = ADDON_GROUPS_HEADERS.trim().split(',');
  return overwriteCsvFile(addonGroupsCsvPath, dataForCsv, csvHeaders);
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
