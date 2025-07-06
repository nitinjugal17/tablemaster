
// src/app/actions/data-management/user-data-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from './_csv-base-actions';
import { USERS_HEADERS } from './_csv-headers';
import type { User, AccountStatus, UserRole as AppUserRoleType } from '@/lib/types'; // Renamed UserRole to AppUserRoleType
import { DEFAULT_USER_ROLES, ALL_ACCOUNT_STATUSES } from '@/lib/types';

const usersCsvPath = path.join(dataDir, 'users.csv');

export async function getUsers(): Promise<User[]> {
  console.warn("[SECURITY_WARNING] Reading users.csv which CONTAINS PLAINTEXT PASSWORDS in this prototype setup. This is for demonstration only and is highly insecure.");
  const rawData = await readCsvFile<any>(usersCsvPath, USERS_HEADERS);
  return rawData.map(user => ({
    id: String(user.id || crypto.randomUUID()),
    email: user.email || '',
    password: user.password || '', // Storing and retrieving plaintext password
    role: user.role || 'user',
    name: user.name || 'Anonymous User',
    phone: user.phone || undefined,
    accountStatus: ALL_ACCOUNT_STATUSES.includes(user.accountStatus) ? user.accountStatus : 'active',
  }));
}

export async function saveUsersCsv(users: User[]): Promise<{ success: boolean; message: string; count?: number }> {
  console.warn("[CRITICAL_SECURITY_WARNING] Saving users.csv. This file STORES PASSWORDS IN PLAINTEXT. This is highly insecure and for prototype demonstration purposes only. DO NOT use this method in a production environment.");
  const dataForCsv = users.map(user => ({
    id: String(user.id || crypto.randomUUID()),
    email: user.email || '',
    password: user.password || '', // Ensure password field is written, even if empty (highly insecure)
    role: user.role || 'user',
    name: user.name || 'Anonymous User',
    phone: user.phone || '',
    accountStatus: user.accountStatus || 'active',
  }));
  const csvHeaders = USERS_HEADERS.trim().split(',');
  return overwriteCsvFile(usersCsvPath, dataForCsv, csvHeaders);
}

export async function downloadUsersCsv(): Promise<string> {
  console.warn("[CRITICAL_SECURITY_WARNING] Downloading users.csv. This file CONTAINS PLAINTEXT PASSWORDS. This is highly insecure and intended for prototype demonstration only.");
  try {
    const users = await getUsers(); 
    if (users.length === 0) return USERS_HEADERS;
    const dataForCsv = users.map(user => ({
        id: user.id,
        email: user.email,
        // DO NOT include actual passwords in a downloadable CSV in a real app.
        // For this prototype, we will include them with a warning.
        password: user.password ? `PLAINTEXT:${user.password}` : 'EMPTY', 
        role: user.role,
        name: user.name,
        phone: user.phone || '',
        accountStatus: user.accountStatus,
    }));
    const csvHeaders = USERS_HEADERS.trim().split(',');
    return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
  } catch (error) {
    console.error(`[User Data Action] Error generating Users CSV for download: ${(error as Error).message}`);
    return USERS_HEADERS;
  }
}

export async function uploadUsersCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  console.warn("[CRITICAL_SECURITY_WARNING] Uploading users.csv. This file might contain PLAINTEXT PASSWORDS. This is highly insecure and for prototype demonstration only.");
  try {
    const parsed = Papa.parse<any>(csvString, { 
      header: true,
      dynamicTyping: false, 
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0) {
      const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
      return { success: false, message: `CSV parsing errors: ${errorMessages}. File not saved.` };
    }
    
    let validatedData: User[];
    try {
        validatedData = parsed.data.map((user, index) => {
            const roleCandidate = user.role || 'user';
            // Allow custom roles from CSV, but UI might not fully support non-default roles
            if (!DEFAULT_USER_ROLES.includes(roleCandidate) && !roleCandidate.match(/^[a-z0-9_]+$/i)) { 
                console.warn(`[User Data Action] Row ${index + 2}: Role '${user.role}' is not a default role and may not be fully supported by UI elements. Allowing for now.`);
            }
            if (!user.email) {
                throw new Error(`Error processing row ${index + 2}: Email is required.`);
            }
            // Password from CSV is expected to be plaintext
            if (!user.password) { 
                console.warn(`[SECURITY_WARNING] Row ${index + 2}: User '${user.email}' has no password in uploaded CSV. This user will not be able to log in unless password set otherwise.`);
            }
            const accountStatusCandidate = user.accountStatus || 'active';
            if (!ALL_ACCOUNT_STATUSES.includes(accountStatusCandidate)) {
                throw new Error(`Error processing row ${index + 2}: Invalid account status '${accountStatusCandidate}'. Valid statuses are: ${ALL_ACCOUNT_STATUSES.join(', ')}.`);
            }

            return {
                id: String(user.id || crypto.randomUUID()),
                email: user.email,
                password: user.password || '', // Store plaintext password from CSV
                role: roleCandidate as AppUserRoleType, // Cast to allow custom roles
                name: user.name || 'Anonymous User',
                phone: user.phone || undefined,
                accountStatus: accountStatusCandidate as AccountStatus,
            };
        });
        
    } catch (validationError) {
        return { success: false, message: (validationError as Error).message + " File not saved."};
    }
    return saveUsersCsv(validatedData);

  } catch (error) {
    console.error(`[User Data Action] Error processing Users CSV upload: ${(error as Error).message}`);
    return { success: false, message: `Error processing/saving CSV: ${(error as Error).message}` };
  }
}
