
// src/app/actions/data-management/role-permission-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from './_csv-base-actions';
import { ROLE_PERMISSIONS_HEADERS } from './_csv-headers';
import type { RolePermission } from '@/lib/types';
import { ALL_APPLICATION_ROUTES } from '@/lib/types';

const rolePermissionsCsvPath = path.join(dataDir, 'role-permissions.csv');

function createDefaultRolePermissions(): RolePermission[] {
  const allRouteIds = ALL_APPLICATION_ROUTES.map(r => r.id);
  const adminRouteIds = allRouteIds.filter(id => !id.startsWith('admin_settings_access_control') && !id.startsWith('admin_settings_encryption'));
  const userRouteIds = ALL_APPLICATION_ROUTES.filter(r => r.group === 'General').map(r => r.id);

  return [
    { roleName: 'superadmin', allowedRouteIds: allRouteIds },
    { roleName: 'admin', allowedRouteIds: adminRouteIds },
    { roleName: 'user', allowedRouteIds: userRouteIds },
  ];
}

export async function getRolePermissions(): Promise<RolePermission[]> {
  try {
    const rawData = await readCsvFile<any>(rolePermissionsCsvPath, ROLE_PERMISSIONS_HEADERS);
    if (rawData.length === 0) {
      console.warn('[Role Permission Action] role-permissions.csv is empty or not found. Creating default permissions.');
      const defaultPermissions = createDefaultRolePermissions();
      await saveRolePermissions(defaultPermissions);
      return defaultPermissions;
    }
    const data = rawData.map(rp => ({
        roleName: String(rp.roleName),
        allowedRouteIds: typeof rp.allowedRouteIds === 'string' 
            ? rp.allowedRouteIds.split(',').map((id: string) => id.trim()).filter(Boolean) 
            : (Array.isArray(rp.allowedRouteIds) ? rp.allowedRouteIds : []),
    }));
    
    const superadminPerm = data.find(p => p.roleName === 'superadmin');
    if (superadminPerm) {
        const allRouteIdsSet = new Set(ALL_APPLICATION_ROUTES.map(r => r.id));
        superadminPerm.allowedRouteIds = Array.from(allRouteIdsSet);
    } else {
        data.push({ roleName: 'superadmin', allowedRouteIds: ALL_APPLICATION_ROUTES.map(r => r.id) });
    }
    return data;
  } catch (error) {
    console.error(`[Role Permission Action] Error reading role-permissions.csv, returning default permissions: ${(error as Error).message}`);
    return createDefaultRolePermissions();
  }
}

export async function saveRolePermissions(permissions: RolePermission[]): Promise<{ success: boolean; message: string; count?: number }> {
  console.log('[Role Permission Action] Attempting to save role permissions CSV.');
  const finalPermissions = permissions.map(rp => {
    if (rp.roleName === 'superadmin') {
      return { ...rp, allowedRouteIds: ALL_APPLICATION_ROUTES.map(r => r.id) };
    }
    return rp;
  });
  if (!finalPermissions.find(rp => rp.roleName === 'superadmin')) {
    finalPermissions.push({ roleName: 'superadmin', allowedRouteIds: ALL_APPLICATION_ROUTES.map(r => r.id)});
  }

  const dataForCsv = finalPermissions.map(p => ({
    roleName: p.roleName,
    allowedRouteIds: p.allowedRouteIds.join(','),
  }));
  const csvHeaders = ROLE_PERMISSIONS_HEADERS.trim().split(',');
  return overwriteCsvFile(rolePermissionsCsvPath, dataForCsv, csvHeaders);
}

export async function downloadRolePermissionsCsv(): Promise<string> {
  try {
    const permissions = await getRolePermissions();
    if (permissions.length === 0) return ROLE_PERMISSIONS_HEADERS;
    const dataForCsv = permissions.map(p => ({
      roleName: p.roleName,
      allowedRouteIds: p.allowedRouteIds.join(','),
    }));
    const csvHeaders = ROLE_PERMISSIONS_HEADERS.trim().split(',');
    return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
  } catch (error) {
    console.error(`[Role Permission Action] Error generating RolePermissions CSV for download: ${(error as Error).message}`);
    return ROLE_PERMISSIONS_HEADERS;
  }
}

export async function uploadRolePermissionsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const parsed = Papa.parse<{roleName: string; allowedRouteIds: string}>(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
      return { success: false, message: `CSV parsing errors: ${errorMessages}. File not saved.` };
    }

    const allValidRouteIds = new Set(ALL_APPLICATION_ROUTES.map(r => r.id));

    const permissionsToSave: RolePermission[] = parsed.data.map((row, index) => {
      if (!row.roleName || typeof row.roleName !== 'string' || row.roleName.trim() === '') {
        throw new Error(`Row ${index + 2}: roleName is missing or invalid.`);
      }
      const routeIds = typeof row.allowedRouteIds === 'string'
        ? row.allowedRouteIds.split(',').map(id => id.trim()).filter(Boolean)
        : [];
      
      const invalidRouteIds = routeIds.filter(id => !allValidRouteIds.has(id));
      if (invalidRouteIds.length > 0) {
        throw new Error(`Row ${index + 2} for role "${row.roleName}": Contains invalid route IDs: ${invalidRouteIds.join(', ')}.`);
      }

      return {
        roleName: row.roleName.trim(),
        allowedRouteIds: routeIds,
      };
    });
    
    let superadminPerm = permissionsToSave.find(p => p.roleName === 'superadmin');
    if (superadminPerm) {
        superadminPerm.allowedRouteIds = ALL_APPLICATION_ROUTES.map(r => r.id); 
    } else {
        permissionsToSave.push({
            roleName: 'superadmin',
            allowedRouteIds: ALL_APPLICATION_ROUTES.map(r => r.id),
        });
    }

    return saveRolePermissions(permissionsToSave);
  } catch (error) {
    console.error(`[Role Permission Action] Error processing RolePermissions CSV upload: ${(error as Error).message}`);
    return { success: false, message: `Error processing RolePermissions CSV: ${(error as Error).message}` };
  }
}
