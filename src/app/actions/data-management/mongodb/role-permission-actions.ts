// src/app/actions/data-management/mongodb/role-permission-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { RolePermission } from '@/lib/types';
import { ALL_APPLICATION_ROUTES } from '@/lib/types';
import Papa from 'papaparse';
import { ROLE_PERMISSIONS_HEADERS } from '../_csv-headers';
import type { WithId } from 'mongodb';

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
      const { db } = await connectToDatabase();
      const permissionsFromDb = await db.collection<RolePermission>('role-permissions').find({}).toArray();

      if (permissionsFromDb.length === 0) {
        console.warn('[Role Permission Action] MongoDB collection is empty. Returning default permissions.');
        const defaultPermissions = createDefaultRolePermissions();
        await saveRolePermissions(defaultPermissions);
        return defaultPermissions;
      }

      const data: RolePermission[] = permissionsFromDb.map((p) => {
        const { _id, ...rest } = p as WithId<RolePermission>;
        return rest;
      });
      
      const superadminPerm = data.find(p => p.roleName === 'superadmin');
      if (superadminPerm) {
          const allRouteIdsSet = new Set(ALL_APPLICATION_ROUTES.map(r => r.id));
          superadminPerm.allowedRouteIds = Array.from(allRouteIdsSet);
      } else {
          data.push({ roleName: 'superadmin', allowedRouteIds: ALL_APPLICATION_ROUTES.map(r => r.id) });
      }
      return data;
  } catch (error) {
    console.error(`[Role Permission Action] Error reading role-permissions from MongoDB, returning default permissions: ${(error as Error).message}`);
    return createDefaultRolePermissions();
  }
}

export async function saveRolePermissions(permissions: RolePermission[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('role-permissions').deleteMany({});
        if (permissions.length > 0) {
            const result = await db.collection('role-permissions').insertMany(permissions as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} role permissions.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all role permissions.', count: 0 };
    } catch (error) {
        console.error("Error saving role permissions to MongoDB:", error);
        return { success: false, message: `Error saving role permissions to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadRolePermissionsCsv(): Promise<string> {
    const permissions = await getRolePermissions();
    if (permissions.length === 0) return ROLE_PERMISSIONS_HEADERS;
    const dataForCsv = permissions.map(p => ({
      roleName: p.roleName,
      allowedRouteIds: p.allowedRouteIds.join(','),
    }));
    return Papa.unparse(dataForCsv, { header: true, columns: ROLE_PERMISSIONS_HEADERS.trim().split(',') });
}

export async function uploadRolePermissionsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<{roleName: string; allowedRouteIds: string}>(csvString, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
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
      return { roleName: row.roleName.trim(), allowedRouteIds: routeIds };
    });
    
    return saveRolePermissions(permissionsToSave);
}
