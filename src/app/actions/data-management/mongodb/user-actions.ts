// src/app/actions/data-management/mongodb/user-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { User } from '@/lib/types';
import Papa from 'papaparse';
import { USERS_HEADERS } from '../_csv-headers';
import { DEFAULT_USER_ROLES, ALL_ACCOUNT_STATUSES } from '@/lib/types';

export async function getUsers(): Promise<User[]> {
  const { db } = await connectToDatabase();
  const users = await db.collection('users').find({}).toArray();

  if (users.length === 0 && process.env.DATA_SOURCE === 'mongodb') {
    console.error("[CRITICAL_ERROR] MongoDB 'users' collection is empty. No users can log in. Please create a superadmin user directly in the database. See the Developer Guide for instructions.");
  }
  
  // Passwords should not be sent to the client. This action is server-side,
  // but any calling function should strip the password before sending to a client component.
  // For this prototype, we return it as the auth logic relies on it.
  return users.map(fromMongo) as User[];
}

export async function saveUsers(users: User[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('users').deleteMany({});
        if (users.length > 0) {
            const usersWithObjectIds = users.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
            }));
            const result = await db.collection('users').insertMany(usersWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} users.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all users.', count: 0 };
    } catch (error) {
        console.error("Error saving users to MongoDB:", error);
        return { success: false, message: `Error saving users to MongoDB: ${(error as Error).message}` };
    }
}


export async function downloadUsersCsv(): Promise<string> {
  console.warn("[CRITICAL_SECURITY_WARNING] Downloading users.csv. This file CONTAINS PLAINTEXT PASSWORDS. This is highly insecure and intended for prototype demonstration only.");
  const users = await getUsers();
  if (users.length === 0) return USERS_HEADERS;
  const dataForCsv = users.map(user => ({
      id: user.id,
      email: user.email,
      password: user.password ? `PLAINTEXT:${user.password}` : 'EMPTY', 
      role: user.role,
      name: user.name,
      phone: user.phone || '',
      accountStatus: user.accountStatus,
      loyaltyPoints: user.loyaltyPoints || 0,
  }));
  return Papa.unparse(dataForCsv, { header: true, columns: USERS_HEADERS.trim().split(',') });
}

export async function uploadUsersCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  console.warn("[CRITICAL_SECURITY_WARNING] Uploading users.csv. This file might contain PLAINTEXT PASSWORDS. This is highly insecure and for prototype demonstration only.");
  try {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
     if (parsed.errors.length > 0) {
      const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
      return { success: false, message: `CSV parsing errors: ${errorMessages}. File not saved.` };
    }
    
    const validatedData: User[] = parsed.data.map((user, index) => {
        const roleCandidate = user.role || 'user';
        if (!DEFAULT_USER_ROLES.includes(roleCandidate) && !roleCandidate.match(/^[a-z0-9_]+$/i)) { 
            console.warn(`[User Data Action] Row ${index + 2}: Role '${user.role}' is not a default role and may not be fully supported by UI elements. Allowing for now.`);
        }
        if (!user.email) throw new Error(`Error processing row ${index + 2}: Email is required.`);
        if (!user.password) console.warn(`[SECURITY_WARNING] Row ${index + 2}: User '${user.email}' has no password in uploaded CSV. This user will not be able to log in unless password set otherwise.`);
        const accountStatusCandidate = user.accountStatus || 'active';
        if (!ALL_ACCOUNT_STATUSES.includes(accountStatusCandidate)) {
            throw new Error(`Error processing row ${index + 2}: Invalid account status '${accountStatusCandidate}'.`);
        }
        return {
            id: String(user.id || crypto.randomUUID()),
            email: user.email,
            password: user.password || '',
            role: roleCandidate,
            name: user.name || 'Anonymous User',
            phone: user.phone || undefined,
            accountStatus: accountStatusCandidate,
            loyaltyPoints: Number(user.loyaltyPoints) || 0,
        };
    });
    return saveUsers(validatedData);
  } catch (error) {
    return { success: false, message: `Error processing/saving CSV: ${(error as Error).message}` };
  }
}
