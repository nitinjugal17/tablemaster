
// src/app/actions/data-management-actions.ts
'use server';

import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import CryptoJS from 'crypto-js';
import { 
    getCollection, fromMongo, toObjectId, 
    getDbStatus as getMongoDbStatus,
    checkSystemReady as checkMongoSystemReady
} from '@/lib/mongodb';
import { 
    getRedisStatus,
    checkSystemReady as checkRedisSystemReady,
    getRedisClient
} from '@/lib/redis';
import { 
    type MenuItem, type User, type Order, type Booking, type RestaurantTable, type Room, type DiscountCode, type Offer, type Banner, type StockItem, type Expense, type Employee, type AddonGroup, type AttendanceRecord, type SalaryPayment, type Feedback, type FeedbackCategory, type PrinterSetting, type InvoiceSetupSettings, type NotificationSettings, type RateLimitConfig, type RolePermission, type StockMenuMapping, type RoomStockItem, type ManagedImage, type Menu, type ConversionRates, type Outlet, type IntegrationSetting, type DailyAvailability,
    DEFAULT_INVOICE_SECTION_ORDER, DEFAULT_HOMEPAGE_LAYOUT, DEFAULT_LIGHT_THEME_COLORS,
    DEFAULT_DARK_THEME_COLORS, defaultNotificationSettings, defaultRateLimitConfig, 
    defaultInvoiceSetupSettings, defaultFeedbackCategories, BASE_CURRENCY_CODE, DEFAULT_CONVERSION_RATES, DEFAULT_USER_ROLES, ALL_APPLICATION_ROUTES, defaultDailyAvailability
} from '@/lib/types';
import { parsePortionDetails } from '@/lib/utils';
import { isValid, parseISO } from 'date-fns';

// =================================================================
// CSV FILE MANAGER LOGIC (CONSOLIDATED)
// =================================================================

const dataDir = path.join(process.cwd(), 'src', 'data');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Ensure data directory exists
async function ensureDataDirExists() {
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Function to encrypt data
const encryptData = (data: string): string => {
  if (!ENCRYPTION_KEY) return data;
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
};

// Function to decrypt data
const decryptData = (ciphertext: string): string => {
  if (!ENCRYPTION_KEY) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    if (!originalText) {
      console.warn(`[CSV Decryption] Decryption resulted in empty text. This may mean the file is not encrypted or the key is wrong. Returning raw data.`);
      return ciphertext; // Fallback to raw data if decryption fails to produce text
    }
    return originalText;
  } catch (e) {
    console.error(`[CSV Decryption] Decryption failed, returning raw data. Error: ${(e as Error).message}`);
    return ciphertext; // Fallback to raw data on error
  }
};


const readCsvData = async <T extends object>(filename: string, defaultData: T[] = []): Promise<T[]> => {
  await ensureDataDirExists();
  const filePath = path.join(dataDir, filename);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const decryptedContent = decryptData(fileContent);
    const { data } = Papa.parse<T>(decryptedContent, { header: true, dynamicTyping: true, skipEmptyLines: true });
    // This is a crucial fix: PapaParse can return an array with a single empty object for an empty file with only a header.
    if (data.length === 1 && Object.values(data[0] as any).every(val => val === null || val === '')) {
      return defaultData;
    }
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`[CSV Read] File not found: ${filename}. Creating with default data.`);
      await writeCsvData(filename, defaultData);
      return defaultData;
    }
    console.error(`[CSV Read] Error reading CSV file ${filename}:`, error);
    return defaultData; // Return default data on other errors too
  }
};

const writeCsvData = async <T extends object>(filename: string, data: T[], headers?: string[]): Promise<{ success: boolean; message: string; count: number }> => {
  await ensureDataDirExists();
  const filePath = path.join(dataDir, filename);
  try {
    const csvString = Papa.unparse(data, { header: true, columns: headers });
    const encryptedContent = encryptData(csvString);
    await fs.writeFile(filePath, encryptedContent, 'utf-8');
    return { success: true, message: `Successfully wrote to ${filename}`, count: data.length };
  } catch (error) {
    console.error(`[CSV Write] Error writing to CSV file ${filename}:`, error);
    return { success: false, message: `Failed to write to ${filename}: ${(error as Error).message}`, count: 0 };
  }
};

const readSettingsData = async <T>(filename: string, defaultData: T): Promise<T> => {
  await ensureDataDirExists();
  const filePath = path.join(dataDir, filename);
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const decryptedContent = decryptData(fileContent);
    return JSON.parse(decryptedContent);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`[JSON Read] File not found: ${filename}. Creating with default data.`);
      await writeSettingsData(filename, defaultData);
      return defaultData;
    }
    console.error(`[JSON Read] Error reading or parsing JSON file ${filename}:`, error);
    return defaultData; // Return default on other errors
  }
};

const writeSettingsData = async <T>(filename: string, data: T): Promise<{ success: boolean; message: string }> => {
  await ensureDataDirExists();
  const filePath = path.join(dataDir, filename);
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const encryptedContent = encryptData(jsonString);
    await fs.writeFile(filePath, encryptedContent, 'utf-8');
    return { success: true, message: `Successfully wrote to ${filename}` };
  } catch (error) {
    console.error(`[JSON Write] Error writing to JSON file ${filename}:`, error);
    return { success: false, message: `Failed to write to ${filename}: ${(error as Error).message}` };
  }
};

async function getCsvEncryptionStatus() {
  return { isActive: !!ENCRYPTION_KEY };
}

async function checkCsvSystemReady() {
    try {
        await fs.access(dataDir);
        // In CSV mode, we can attempt to read a core file.
        // If it throws an unrecoverable error (not ENOENT), it might indicate a problem.
        await readCsvData('users.csv', []);
        return { isReady: true, message: 'CSV data source is ready.' };
    } catch (error) {
        console.error("System readiness check for CSV failed:", error);
        return { isReady: false, message: `Failed to access or read from data directory: ${(error as Error).message}` };
    }
}

// =================================================================
// DATA SOURCE DISPATCHER
// =================================================================

// This is a global cache for the DB connection status per request.
let dbConnectionStatus: { isConnected: boolean; message: string } | null = null;
let redisConnectionStatus: { isConnected: boolean; message: string } | null = null;

async function shouldUseMongo(): Promise<boolean> {
  const isMongoConfigured = process.env.DATA_SOURCE === 'mongodb';
  if (!isMongoConfigured) {
    return false;
  }
  
  // Always re-verify the connection if we don't have a success status for this request.
  if (!dbConnectionStatus || !dbConnectionStatus.isConnected) {
    dbConnectionStatus = await getMongoDbStatus();
  }
  
  if (!dbConnectionStatus.isConnected) {
    console.warn(`[Data Dispatcher] WARN: MongoDB connection failed: "${dbConnectionStatus.message}". Falling back to CSV data source for this request.`);
    return false;
  }
  
  return true;
}

async function shouldUseRedis(): Promise<boolean> {
    const isRedisConfigured = process.env.DATA_SOURCE === 'redis';
    if (!isRedisConfigured) {
      return false;
    }
    if (!redisConnectionStatus || !redisConnectionStatus.isConnected) {
        redisConnectionStatus = await getRedisStatus();
    }
    if (!redisConnectionStatus.isConnected) {
      console.warn(`[Data Dispatcher] WARN: Redis connection failed: "${redisConnectionStatus.message}". Falling back to CSV data source for this request.`);
      return false;
    }
    return true;
}


// =================================================================
// GENERAL STATUS ACTIONS
// =================================================================
export async function getDataSource(): Promise<string> {
    return process.env.DATA_SOURCE || 'csv';
}

export async function getDbConnectionStatus(): Promise<{ isConnected: boolean, message: string }> {
    const dataSource = await getDataSource();

    if (dataSource === 'mongodb') {
        if (!dbConnectionStatus || !dbConnectionStatus.isConnected) {
            dbConnectionStatus = await getMongoDbStatus();
        }
        return dbConnectionStatus;
    }
    if (dataSource === 'redis') {
        if (!redisConnectionStatus || !redisConnectionStatus.isConnected) {
            redisConnectionStatus = await getRedisStatus();
        }
        return redisConnectionStatus;
    }
    
    // Default to CSV status
    return { isConnected: true, message: 'Using CSV data source, which is always "connected".' };
}


export async function getEncryptionStatus(): Promise<{ isActive: boolean }> {
    return getCsvEncryptionStatus();
}

export async function checkSystemReady(): Promise<{ isReady: boolean, message: string }> {
    const dataSource = await getDataSource();
    if (dataSource === 'mongodb') {
        return checkMongoSystemReady();
    }
    if (dataSource === 'redis') {
        return checkRedisSystemReady();
    }
    return checkCsvSystemReady();
}

export async function getActiveDataSourceStatus(): Promise<{ isFallback: boolean; message: string }> {
    const isMongoEnv = process.env.DATA_SOURCE === 'mongodb';
    const isRedisEnv = process.env.DATA_SOURCE === 'redis';
    
    if (isMongoEnv) {
        const status = await getDbConnectionStatus();
        if (status.isConnected) {
            return { isFallback: false, message: `Currently using mongodb data source.` };
        } else {
            return { isFallback: true, message: `MongoDB connection failed: "${status.message || 'Unknown reason'}".` };
        }
    }
     if (isRedisEnv) {
        const status = await getDbConnectionStatus();
        if (status.isConnected) {
            return { isFallback: false, message: `Currently using redis data source.` };
        } else {
            return { isFallback: true, message: `Redis connection failed: "${status.message || 'Unknown reason'}".` };
        }
    }
    
    // Default to CSV
    return { isFallback: false, message: 'Currently using csv data source.' };
}

// =================================================================
// DATA PARSING UTILITY
// =================================================================
/**
 * Ensures that specific fields within a data object are properly parsed from JSON strings.
 * This is crucial for data coming from CSV files where objects/arrays are stringified.
 * @param data The array of data objects to process.
 * @param fieldsToParse An array of key names that should be parsed.
 * @returns The processed data with specified fields parsed.
 */
function parseJsonFields<T extends object>(data: T[], fieldsToParse: (keyof T)[]): T[] {
  return data.map(item => {
    const newItem = { ...item };
    for (const field of fieldsToParse) {
      if (Object.prototype.hasOwnProperty.call(newItem, field)) {
        const value = newItem[field];
        // Only attempt to parse if it's a non-empty string that looks like JSON
        if (typeof value === 'string' && value.trim().length > 0 && (value.trim().startsWith('{') || value.trim().startsWith('[')) && value !== '[object Object]') {
           try {
              (newItem as any)[field] = JSON.parse(value);
           } catch (e) {
               console.error(`[parseJsonFields] Could not parse field "${String(field)}" with value: "${value}". Leaving as string.`);
           }
        }
      }
    }
    return newItem;
  });
}

function stringifyDataForCsv<T extends object>(data: T[], fieldsToStringify: (keyof T)[]): T[] {
  return data.map(item => {
    let newItem = { ...item };
    for (const field of fieldsToStringify) {
      if (newItem[field] && typeof newItem[field] !== 'string') {
        (newItem as any)[field] = JSON.stringify(newItem[field]);
      }
    }
    return newItem;
  });
}

// =================================================================
// USERS
// =================================================================
export async function getUsers(): Promise<User[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            const data = await client.get('data:users');
            if (data) return JSON.parse(data);
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<User>('users');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<User>('users.csv');
}
export async function saveUsers(data: User[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            await client.set('data:users', JSON.stringify(data));
            return { success: true, message: 'Users saved to Redis successfully.' };
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<User>('users');
        await collection.deleteMany({});
        if (data.length > 0) {
            const dataToInsert = data.map(({ id, ...rest }) => ({ ...rest, _id: toObjectId(id) }));
            await collection.insertMany(dataToInsert as any);
        }
        return { success: true, message: 'Users saved to MongoDB successfully.' };
    }
    return await writeCsvData<User>('users.csv', data);
}

// =================================================================
// MENU ITEMS
// =================================================================
export async function getMenuItems(): Promise<MenuItem[]> {
    const today = new Date().toISOString().split('T')[0];
    const dailyAvailability = await getDailyAvailability();
    const disabledIds = (dailyAvailability.date === today) ? new Set(dailyAvailability.disabledMenuItemIds) : new Set();
    
    let menuItems: MenuItem[];

    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            const data = await client.get('data:menu_items');
            if (data) menuItems = JSON.parse(data); else menuItems = [];
        } else {
            menuItems = [];
        }
    } else if (await shouldUseMongo()) {
        const collection = await getCollection<MenuItem>('menu-items');
        menuItems = (await collection.find().toArray()).map(fromMongo);
    } else {
        menuItems = await readCsvData<MenuItem>('menu-items.csv');
    }
    
    // Apply temporary availability status
    return menuItems.map(item => ({
        ...item,
        isAvailable: item.isAvailable && !disabledIds.has(item.id),
        isTemporarilyUnavailable: disabledIds.has(item.id),
    }));
}
export async function saveMenuItemChanges(items: MenuItem[]): Promise<{ success: boolean; message: string }> {
    // Before saving, strip out temporary status fields
    const dataToSave = items.map(({ isTemporarilyUnavailable, ...rest }) => rest);
    const dataWithStringifiedPortions = stringifyDataForCsv(dataToSave, ['portionDetails', 'addonGroups']);

    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            await client.set('data:menu_items', JSON.stringify(dataWithStringifiedPortions));
            return { success: true, message: 'Menu items saved to Redis successfully.' };
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<MenuItem>('menu-items');
        await collection.deleteMany({});
        if (dataWithStringifiedPortions.length > 0) {
            await collection.insertMany(dataWithStringifiedPortions.map(({ id, ...rest }) => ({ ...rest, _id: toObjectId(id) })) as any);
        }
        return { success: true, message: 'Menu items saved to MongoDB successfully.' };
    }
    return await writeCsvData('menu-items.csv', dataWithStringifiedPortions);
}

// =================================================================
// RESTAURANT & BOOKING
// =================================================================
export async function getRestaurantTables(): Promise<RestaurantTable[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            const data = await client.get('data:tables');
            if (data) return JSON.parse(data);
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<RestaurantTable>('restaurant-tables');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<RestaurantTable>('restaurant-tables.csv');
}
export async function saveRestaurantTables(data: RestaurantTable[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            await client.set('data:tables', JSON.stringify(data));
            return { success: true, message: 'Tables saved to Redis successfully.' };
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<RestaurantTable>('restaurant-tables');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Restaurant tables saved to MongoDB successfully.' };
    }
    return await writeCsvData<RestaurantTable>('restaurant-tables.csv', data);
}

export async function getRooms(): Promise<Room[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            const data = await client.get('data:rooms');
            if (data) return JSON.parse(data);
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Room>('rooms');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return (await readCsvData<Room>('rooms.csv')).map(r => ({ ...r, imageUrls: String(r.imageUrls || '') }));
}
export async function saveRooms(data: Room[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            await client.set('data:rooms', JSON.stringify(data));
            return { success: true, message: 'Rooms saved to Redis successfully.' };
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Room>('rooms');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Rooms saved to MongoDB successfully.' };
    }
    return await writeCsvData<Room>('rooms.csv', data);
}

export async function getBookings(): Promise<Booking[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            const data = await client.get('data:bookings');
            if (data) return parseJsonFields(JSON.parse(data), ['items']);
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Booking>('bookings');
        return (await collection.find().toArray()).map(fromMongo);
    }
    const data = await readCsvData<Booking>('bookings.csv');
    return parseJsonFields(data, ['items']);
}
export async function saveBookings(data: Booking[]): Promise<{ success: boolean; message: string }> {
    const dataToSave = stringifyDataForCsv(data, ['items']);
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            await client.set('data:bookings', JSON.stringify(dataToSave));
            return { success: true, message: 'Bookings saved to Redis successfully.' };
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Booking>('bookings');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Bookings saved to MongoDB successfully.' };
    }
    return await writeCsvData<Booking>('bookings.csv', dataToSave);
}

// =================================================================
// ORDERS
// =================================================================
export async function getOrders(): Promise<Order[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            const data = await client.get('data:orders');
            if (data) return parseJsonFields(JSON.parse(data), ['items']);
        }
    }
    if (await shouldUseMongo()) {
        const mongoOrders = (await (await getCollection<Order>('orders')).find().toArray()).map(fromMongo);
        return mongoOrders.map(order => ({
            ...order,
            createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
        }));
    }

    const data = await readCsvData<Order>('orders.csv');
    const processedData = data.map(order => {
        let { createdAt } = order;
        let dateObject;
        try {
            dateObject = createdAt instanceof Date ? createdAt : typeof createdAt === 'string' ? parseISO(createdAt) : null;
            if (!dateObject || !isValid(dateObject)) throw new Error("Invalid date");
        } catch (e) {
            console.warn(`[Data Action] Order #${order.id} has an invalid or missing createdAt date ("${createdAt}"). Resetting to current time.`);
            dateObject = new Date();
        }
        return {
            ...order,
            createdAt: dateObject.toISOString(),
            items: (typeof order.items === 'string') ? order.items : JSON.stringify(order.items || []),
        };
    });
    return parseJsonFields(processedData, ['items']);
}

export async function saveOrders(data: Order[]): Promise<{ success: boolean; message: string }> {
    const dataToSave = stringifyDataForCsv(data, ['items']);
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            await client.set('data:orders', JSON.stringify(dataToSave));
            return { success: true, message: 'Orders saved to Redis successfully.' };
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Order>('orders');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Orders saved to MongoDB successfully.' };
    }
    return await writeCsvData<Order>('orders.csv', dataToSave);
}

// ... Implement Redis logic for all remaining functions following the same pattern ...
// =================================================================
// INVENTORY & EXPENSES
// =================================================================
export async function getStockItems(): Promise<StockItem[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:stock_items'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<StockItem>('stock-items');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<StockItem>('stock-items.csv');
}
export async function saveStockItems(data: StockItem[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:stock_items', JSON.stringify(data)); return { success: true, message: 'Stock items saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<StockItem>('stock-items');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Stock items saved to MongoDB successfully.' };
    }
    return await writeCsvData<StockItem>('stock-items.csv', data);
}

export async function getExpenses(): Promise<Expense[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:expenses'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Expense>('expenses');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<Expense>('expenses.csv');
}
export async function saveExpenses(data: Expense[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:expenses', JSON.stringify(data)); return { success: true, message: 'Expenses saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Expense>('expenses');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Expenses saved to MongoDB successfully.' };
    }
    return await writeCsvData<Expense>('expenses.csv', data);
}

// =================================================================
// HR
// =================================================================
export async function getEmployees(): Promise<Employee[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:employees'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Employee>('employees');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<Employee>('employees.csv');
}
export async function saveEmployees(data: Employee[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:employees', JSON.stringify(data)); return { success: true, message: 'Employees saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Employee>('employees');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Employees saved to MongoDB successfully.' };
    }
    return await writeCsvData<Employee>('employees.csv', data);
}

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:attendance'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<AttendanceRecord>('attendance');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<AttendanceRecord>('attendance.csv');
}
export async function saveAttendanceRecords(data: AttendanceRecord[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:attendance', JSON.stringify(data)); return { success: true, message: 'Attendance saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<AttendanceRecord>('attendance');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Attendance records saved to MongoDB successfully.' };
    }
    return await writeCsvData<AttendanceRecord>('attendance.csv', data);
}

export async function getSalaryPayments(): Promise<SalaryPayment[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:salary_payments'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<SalaryPayment>('salary-payments');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<SalaryPayment>('salary-payments.csv');
}
export async function saveSalaryPayments(data: SalaryPayment[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:salary_payments', JSON.stringify(data)); return { success: true, message: 'Salary payments saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<SalaryPayment>('salary-payments');
        // This should append, not replace
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Salary payments saved to MongoDB successfully.' };
    }
    const existing = await getSalaryPayments();
    const updated = [...existing, ...data];
    return await writeCsvData<SalaryPayment>('salary-payments.csv', updated);
}

// =================================================================
// MARKETING
// =================================================================
export async function getDiscounts(): Promise<DiscountCode[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:discounts'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<DiscountCode>('discounts');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return (await readCsvData<DiscountCode>('discounts.csv')).map(d => ({ ...d, validFrom: String(d.validFrom || ''), validTo: String(d.validTo || ''), }));
}
export async function saveDiscounts(data: DiscountCode[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:discounts', JSON.stringify(data)); return { success: true, message: 'Discounts saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<DiscountCode>('discounts');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Discounts saved to MongoDB successfully.' };
    }
    return await writeCsvData<DiscountCode>('discounts.csv', data);
}

export async function getOffers(): Promise<Offer[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:offers'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Offer>('offers');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return (await readCsvData<Offer>('offers.csv')).map(o => ({ ...o, validFrom: String(o.validFrom || ''), validTo: String(o.validTo || ''), }));
}
export async function saveOffers(data: Offer[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:offers', JSON.stringify(data)); return { success: true, message: 'Offers saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Offer>('offers');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Offers saved to MongoDB successfully.' };
    }
    return await writeCsvData<Offer>('offers.csv', data);
}

export async function getBanners(): Promise<Banner[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:banners'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Banner>('banners');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<Banner>('banners.csv');
}
export async function saveBanners(data: Banner[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:banners', JSON.stringify(data)); return { success: true, message: 'Banners saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Banner>('banners');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Banners saved to MongoDB successfully.' };
    }
    return await writeCsvData<Banner>('banners.csv', data);
}

// =================================================================
// FEEDBACK
// =================================================================
export async function getFeedback(): Promise<Feedback[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:feedback'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Feedback>('feedback');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<Feedback>('feedback.csv');
}
export async function saveFeedback(data: Feedback[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:feedback', JSON.stringify(data)); return { success: true, message: 'Feedback saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Feedback>('feedback');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Feedback saved to MongoDB successfully.' };
    }
    return await writeCsvData<Feedback>('feedback.csv', data);
}

export async function getFeedbackCategories(): Promise<FeedbackCategory[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:feedback_categories'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<FeedbackCategory>('feedback-categories');
        const categories = (await collection.find().toArray()).map(fromMongo);
        return categories.length > 0 ? categories : defaultFeedbackCategories;
    }
    return await readCsvData<FeedbackCategory>('feedback-categories.csv', defaultFeedbackCategories);
}
export async function saveFeedbackCategories(data: FeedbackCategory[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:feedback_categories', JSON.stringify(data)); return { success: true, message: 'Feedback categories saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<FeedbackCategory>('feedback-categories');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Feedback categories saved to MongoDB successfully.' };
    }
    return await writeCsvData<FeedbackCategory>('feedback-categories.csv', data);
}

// =================================================================
// MENU-RELATED (Addons, Mappings, etc.)
// =================================================================
export async function getAddonGroups(): Promise<AddonGroup[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:addon_groups'); if (data) return parseJsonFields(JSON.parse(data), ['addons']); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<AddonGroup>('addon-groups');
        return (await collection.find().toArray()).map(fromMongo);
    }
    const data = await readCsvData<AddonGroup>('addon-groups.csv');
    return parseJsonFields(data, ['addons']);
}
export async function saveAddonGroups(data: AddonGroup[]): Promise<{ success: boolean; message: string }> {
    const dataToSave = stringifyDataForCsv(data, ['addons']);
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:addon_groups', JSON.stringify(dataToSave)); return { success: true, message: 'Addon groups saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<AddonGroup>('addon-groups');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Addon groups saved to MongoDB successfully.' };
    }
    return await writeCsvData<AddonGroup>('addon-groups.csv', dataToSave);
}

export async function getStockMenuMappings(): Promise<StockMenuMapping[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:stock_menu_mappings'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<StockMenuMapping>('stock-menu-mappings');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<StockMenuMapping>('stock-menu-mappings.csv');
}
export async function saveStockMenuMappings(data: StockMenuMapping[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:stock_menu_mappings', JSON.stringify(data)); return { success: true, message: 'Stock mappings saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<StockMenuMapping>('stock-menu-mappings');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Stock-menu mappings saved to MongoDB successfully.' };
    }
    return await writeCsvData<StockMenuMapping>('stock-menu-mappings.csv', data);
}

export async function getRoomStock(roomId?: string): Promise<RoomStockItem[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            const keys = await client.keys('stock:room:*');
            const data: RoomStockItem[] = [];
            for (const key of keys) {
                const stockData = await client.get(key);
                if (stockData) data.push(...JSON.parse(stockData));
            }
            return roomId ? data.filter(s => s.roomId === roomId) : data;
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<RoomStockItem>('room-stock');
        const query = roomId ? { roomId: roomId } : {};
        return (await collection.find(query).toArray()).map(fromMongo);
    }
    const allStock = await readCsvData<RoomStockItem>('room-stock.csv');
    return roomId ? allStock.filter(s => s.roomId === roomId) : allStock;
}
export async function saveRoomStock(roomId: string, data: RoomStockItem[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) {
            await client.set(`stock:room:${roomId}`, JSON.stringify(data));
            return { success: true, message: `Room stock for room ${roomId} saved to Redis.` };
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<RoomStockItem>('room-stock');
        await collection.deleteMany({ roomId: roomId });
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: `Room stock for room ${roomId} saved to MongoDB.` };
    }
    const allStock = await getRoomStock();
    const otherRoomsStock = allStock.filter(s => s.roomId !== roomId);
    const updatedStock = [...otherRoomsStock, ...data];
    return await writeCsvData<RoomStockItem>('room-stock.csv', updatedStock);
}

export async function getManagedImages(): Promise<ManagedImage[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:managed_images'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<ManagedImage>('managed-images');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<ManagedImage>('managed-images.csv');
}
export async function saveManagedImages(data: ManagedImage[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:managed_images', JSON.stringify(data)); return { success: true, message: 'Managed images saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<ManagedImage>('managed-images');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Managed images saved to MongoDB successfully.' };
    }
    return await writeCsvData<ManagedImage>('managed-images.csv', data);
}

export async function getMenus(): Promise<Menu[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:menus'); if (data) return parseJsonFields(JSON.parse(data), ['menuItemIds']); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Menu>('menus');
        return (await collection.find().toArray()).map(fromMongo);
    }
    const data = await readCsvData<Menu>('menus.csv');
    return parseJsonFields(data, ['menuItemIds']);
}
export async function saveMenus(data: Menu[]): Promise<{ success: boolean; message: string }> {
    const dataToSave = stringifyDataForCsv(data, ['menuItemIds']);
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:menus', JSON.stringify(dataToSave)); return { success: true, message: 'Menus saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Menu>('menus');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Menus saved to MongoDB successfully.' };
    }
    return await writeCsvData<Menu>('menus.csv', dataToSave);
}

export async function getOutlets(): Promise<Outlet[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:outlets'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Outlet>('outlets');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<Outlet>('outlets.csv');
}
export async function saveOutlets(data: Outlet[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:outlets', JSON.stringify(data)); return { success: true, message: 'Outlets saved to Redis successfully.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<Outlet>('outlets');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Outlets saved to MongoDB successfully.' };
    }
    return await writeCsvData<Outlet>('outlets.csv', data);
}

// =================================================================
// JSON-BASED SETTINGS
// =================================================================
export async function getGeneralSettings(): Promise<InvoiceSetupSettings> {
    const useRedis = await shouldUseRedis();
    if (useRedis) {
        const client = await getRedisClient();
        if (client) {
            const settingsJson = await client.get('settings:general');
            if (settingsJson) return JSON.parse(settingsJson);
        }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<any>('settings');
        const doc = await collection.findOne({ type: 'general' });
        if (doc?.data) {
             if (useRedis) {
                const client = await getRedisClient();
                if(client) await client.set('settings:general', JSON.stringify(doc.data));
            }
            return doc.data;
        }
    }
    return await readSettingsData('general-settings.json', defaultInvoiceSetupSettings);
}
export async function saveGeneralSettings(data: InvoiceSetupSettings): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('settings:general', JSON.stringify(data)); return { success: true, message: 'General settings saved to Redis.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<any>('settings');
        await collection.updateOne({ type: 'general' }, { $set: { data } }, { upsert: true });
        return { success: true, message: 'General settings saved to MongoDB.' };
    }
    return await writeSettingsData('general-settings.json', data);
}

export async function getDailyAvailability(): Promise<DailyAvailability> {
    const today = new Date().toISOString().split('T')[0];
    
    // Redis implementation (conceptual)
    // if (await shouldUseRedis()) { ... }

    // Mongo implementation (conceptual)
    // if (await shouldUseMongo()) { ... }

    // CSV implementation
    const data = await readSettingsData('daily-availability.json', defaultDailyAvailability);
    if (data.date !== today) {
        // Date has changed, reset the list and save
        const newAvailabilityData = { date: today, disabledMenuItemIds: [] };
        await writeSettingsData('daily-availability.json', newAvailabilityData);
        return newAvailabilityData;
    }
    return data;
}

export async function saveDailyAvailability(data: DailyAvailability): Promise<{ success: boolean; message: string }> {
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) {
        return { success: false, message: "Stale availability data. Please refresh." };
    }
    // Implement Redis and Mongo logic here if needed
    return await writeSettingsData('daily-availability.json', data);
}


export async function getNotificationSettings(): Promise<NotificationSettings> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('settings:notifications'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<any>('settings');
        const doc = await collection.findOne({ type: 'notifications' });
        return doc ? doc.data : defaultNotificationSettings;
    }
    return await readSettingsData('notification-settings.json', defaultNotificationSettings);
}
export async function saveNotificationSettings(data: NotificationSettings): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('settings:notifications', JSON.stringify(data)); return { success: true, message: 'Notification settings saved to Redis.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<any>('settings');
        await collection.updateOne({ type: 'notifications' }, { $set: { data } }, { upsert: true });
        return { success: true, message: 'Notification settings saved to MongoDB.' };
    }
    return await writeSettingsData('notification-settings.json', data);
}

export async function getRateLimitConfig(): Promise<RateLimitConfig> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('settings:rate_limit'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<any>('settings');
        const doc = await collection.findOne({ type: 'rateLimit' });
        return doc ? doc.data : defaultRateLimitConfig;
    }
    const data = await readCsvData<RateLimitConfig>('rate-limit-config.csv', [defaultRateLimitConfig]);
    return data[0] || defaultRateLimitConfig;
}
export async function saveRateLimitConfig(data: RateLimitConfig): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('settings:rate_limit', JSON.stringify(data)); return { success: true, message: 'Rate limit config saved to Redis.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<any>('settings');
        await collection.updateOne({ type: 'rateLimit' }, { $set: { data } }, { upsert: true });
        return { success: true, message: 'Rate limit config saved to MongoDB.' };
    }
    return await writeCsvData<RateLimitConfig>('rate-limit-config.csv', [data]);
}

export async function getRolePermissions(): Promise<RolePermission[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:role_permissions'); if (data) return parseJsonFields(JSON.parse(data), ['allowedRouteIds']); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<RolePermission>('role-permissions');
        const data = (await collection.find().toArray()).map(doc => ({ roleName: doc.roleName, allowedRouteIds: doc.allowedRouteIds, }));
        return data.length > 0 ? data : [];
    }
    const data = await readCsvData<RolePermission>('role-permissions.csv');
    return data.map(rp => {
        let ids: string[] = [];
        if (Array.isArray(rp.allowedRouteIds)) { ids = rp.allowedRouteIds; }
        else if (typeof rp.allowedRouteIds === 'string') {
            if (rp.allowedRouteIds.startsWith('[')) { try { ids = JSON.parse(rp.allowedRouteIds); } catch(e) { ids = []; } }
            else { ids = rp.allowedRouteIds.split(',').map(s => s.trim()).filter(Boolean); }
        }
        return { ...rp, allowedRouteIds: ids };
    });
}
export async function saveRolePermissions(data: RolePermission[]): Promise<{ success: boolean; message: string }> {
    const dataToSave = stringifyDataForCsv(data, ['allowedRouteIds']);
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:role_permissions', JSON.stringify(dataToSave)); return { success: true, message: 'Role permissions saved to Redis.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<RolePermission>('role-permissions');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data as any);
        return { success: true, message: 'Role permissions saved to MongoDB successfully.' };
    }
    return await writeCsvData<RolePermission>('role-permissions.csv', dataToSave);
}

export async function getPrinterSettings(): Promise<PrinterSetting[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:printer_settings'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<PrinterSetting>('printer-settings');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<PrinterSetting>('printer-settings.csv');
}
export async function savePrinterSettings(data: PrinterSetting[]): Promise<{ success: boolean; message: string; count?: number }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:printer_settings', JSON.stringify(data)); return { success: true, message: 'Printer settings saved to Redis.', count: data.length }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<PrinterSetting>('printer-settings');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Printer settings saved to MongoDB successfully.', count: data.length };
    }
    return await writeCsvData<PrinterSetting>('printer-settings.csv', data);
}

export async function getConversionRates(): Promise<ConversionRates> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('settings:conversion_rates'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<any>('settings');
        const doc = await collection.findOne({ type: 'conversionRates' });
        return doc ? doc.data : DEFAULT_CONVERSION_RATES;
    }
    return await readSettingsData('conversion-rates.json', DEFAULT_CONVERSION_RATES);
}
export async function saveConversionRates(rates: Partial<Record<"USD" | "INR" | "GBP", number>>): Promise<{ success: boolean; message: string }> {
    const fullRates: ConversionRates = { [BASE_CURRENCY_CODE]: { ...(DEFAULT_CONVERSION_RATES[BASE_CURRENCY_CODE]), ...rates, [BASE_CURRENCY_CODE]: 1, } };
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('settings:conversion_rates', JSON.stringify(fullRates)); return { success: true, message: 'Conversion rates saved to Redis.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<any>('settings');
        await collection.updateOne({ type: 'conversionRates' }, { $set: { data: fullRates } }, { upsert: true });
        return { success: true, message: 'Conversion rates saved to MongoDB.' };
    }
    return await writeSettingsData('conversion-rates.json', fullRates);
}

export async function getIntegrationSettings(): Promise<IntegrationSetting[]> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { const data = await client.get('data:integration_settings'); if (data) return JSON.parse(data); }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<IntegrationSetting>('integration-settings');
        return (await collection.find().toArray()).map(fromMongo);
    }
    return await readCsvData<IntegrationSetting>('integration-settings.csv');
}
export async function saveIntegrationSettings(data: IntegrationSetting[]): Promise<{ success: boolean; message: string }> {
    if (await shouldUseRedis()) {
        const client = await getRedisClient();
        if (client) { await client.set('data:integration_settings', JSON.stringify(data)); return { success: true, message: 'Integration settings saved to Redis.' }; }
    }
    if (await shouldUseMongo()) {
        const collection = await getCollection<IntegrationSetting>('integration-settings');
        await collection.deleteMany({});
        if(data.length > 0) await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any);
        return { success: true, message: 'Integration settings saved to MongoDB successfully.' };
    }
    return await writeCsvData<IntegrationSetting>('integration-settings.csv', data);
}

// =================================================================
// DATA EXPORT/IMPORT ACTIONS (No changes needed, they call the getters/savers above)
// =================================================================
export const downloadMenuItemsCsv = async () => Papa.unparse(stringifyDataForCsv(await getMenuItems(), ['portionDetails', 'addonGroups']));
export const uploadMenuItemsCsv = async (csvString: string) => {
    const { data } = Papa.parse<MenuItem>(csvString, { header: true, dynamicTyping: true, skipEmptyLines: true });
    return saveMenuItemChanges(data);
};
export const downloadOrdersCsv = async () => Papa.unparse(stringifyDataForCsv(await getOrders(), ['items']));
export const uploadOrdersCsv = async (csvString: string) => uploadGenericCsv<Order>(csvString, 'orders', item => !!item.id && !!item.customerName, saveOrders);
export const downloadUsersCsv = async () => Papa.unparse(await getUsers());
export const uploadUsersCsv = async (csvString: string) => uploadGenericCsv<User>(csvString, 'users', item => !!item.id && !!item.email, saveUsers);
export const downloadBookingsCsv = async () => Papa.unparse(stringifyDataForCsv(await getBookings(), ['items']));
export const uploadBookingsCsv = async (csvString: string) => uploadGenericCsv<Booking>(csvString, 'bookings', item => !!item.id && !!item.customerName, saveBookings);
export const downloadRestaurantTablesCsv = async () => Papa.unparse(await getRestaurantTables());
export const uploadRestaurantTablesCsv = async (csvString: string) => uploadGenericCsv<RestaurantTable>(csvString, 'restaurant-tables', item => !!item.id && !!item.name, saveRestaurantTables);
export const downloadRoomsCsv = async () => Papa.unparse(await getRooms());
export const uploadRoomsCsv = async (csvString: string) => uploadGenericCsv<Room>(csvString, 'rooms', item => !!item.id && !!item.name, saveRooms);
export const downloadDiscountsCsv = async () => Papa.unparse(await getDiscounts());
export const uploadDiscountsCsv = async (csvString: string) => uploadGenericCsv<DiscountCode>(csvString, 'discounts', item => !!item.id && !!item.code, saveDiscounts);
export const downloadOffersCsv = async () => Papa.unparse(await getOffers());
export const uploadOffersCsv = async (csvString: string) => uploadGenericCsv<Offer>(csvString, 'offers', item => !!item.id && !!item.title, saveOffers);
export const downloadBannersCsv = async () => Papa.unparse(await getBanners());
export const uploadBannersCsv = async (csvString: string) => uploadGenericCsv<Banner>(csvString, 'banners', item => !!item.id && !!item.title, saveBanners);
export const downloadManagedImagesCsv = async () => Papa.unparse(await getManagedImages());
export const uploadManagedImagesCsv = async (csvString: string) => uploadGenericCsv<ManagedImage>(csvString, 'managed-images', item => !!item.id && !!item.imageUrl, saveManagedImages);
export const downloadStockItemsCsv = async () => Papa.unparse(await getStockItems());
export const uploadStockItemsCsv = async (csvString: string) => uploadGenericCsv<StockItem>(csvString, 'stock-items', item => !!item.id && !!item.name, saveStockItems);
export const downloadExpensesCsv = async () => Papa.unparse(await getExpenses());
export const uploadExpensesCsv = async (csvString: string) => uploadGenericCsv<Expense>(csvString, 'expenses', item => !!item.id && !!item.description, saveExpenses);
export const downloadStockMenuMappingsCsv = async () => Papa.unparse(await getStockMenuMappings());
export const uploadStockMenuMappingsCsv = async (csvString: string) => uploadGenericCsv<StockMenuMapping>(csvString, 'stock-menu-mappings', item => !!item.id && !!item.stockItemId && !!item.menuItemId, saveStockMenuMappings);
export const downloadGeneralSettingsCsv = async () => JSON.stringify(await getGeneralSettings(), null, 2);
export const uploadGeneralSettingsCsv = async (jsonString: string) => { try { const data = JSON.parse(jsonString); return saveGeneralSettings(data); } catch (e) { return { success: false, message: "Invalid JSON format for General Settings." }; } };
export const downloadPrinterSettingsCsv = async () => Papa.unparse(await getPrinterSettings());
export const uploadPrinterSettingsCsv = async (csvString: string) => uploadGenericCsv<PrinterSetting>(csvString, 'printer-settings', item => !!item.id && !!item.name, savePrinterSettings);
export const downloadConversionRatesCsv = async () => JSON.stringify(await getConversionRates(), null, 2);
export const uploadConversionRatesCsv = async (jsonString: string) => { try { const data = JSON.parse(jsonString); return saveConversionRates(data[BASE_CURRENCY_CODE] || {}); } catch (e) { return { success: false, message: "Invalid JSON format for Currency Rates." }; } };
export const downloadRolePermissionsCsv = async () => Papa.unparse(stringifyDataForCsv(await getRolePermissions(), ['allowedRouteIds']));
export const uploadRolePermissionsCsv = async (csvString: string) => { const { data } = Papa.parse<RolePermission>(csvString, { header: true, dynamicTyping: true, skipEmptyLines: true }); const validData = data.filter(item => !!item.roleName); if (await shouldUseMongo()) { const collection = await getCollection<RolePermission>('role-permissions'); await collection.deleteMany({}); if (validData.length > 0) { await collection.insertMany(validData as any); } return { success: true, message: `Role permissions imported to MongoDB successfully.` }; } return saveRolePermissions(validData); };
export const downloadRateLimitConfigCsv = async () => Papa.unparse([await getRateLimitConfig()]);
export const uploadRateLimitConfigCsv = async (csvString: string) => { const { data } = Papa.parse<RateLimitConfig>(csvString, { header: true, dynamicTyping: true, skipEmptyLines: true }); return saveRateLimitConfig(data[0] || defaultRateLimitConfig); };
async function uploadGenericCsv<T extends {id: string}>(csvString: string, collectionName: string, validationFn: (item: any) => boolean, saveCsvFn: (data: T[]) => Promise<any>): Promise<{success: boolean; message: string}> { const { data } = Papa.parse<T>(csvString, { header: true, dynamicTyping: true, skipEmptyLines: true }); const validData = data.filter(validationFn); if (await shouldUseMongo()) { return handleMongoUpload<T>(collectionName, validData); } return saveCsvFn(validData); };
async function handleMongoUpload<T extends {id: string}>(collectionName: string, data: T[]): Promise<{ success: boolean; message: string; }> { if (data.length === 0) { return { success: true, message: 'CSV file was empty. No changes made.'}; } const collection = await getCollection<T>(collectionName); await collection.deleteMany({}); await collection.insertMany(data.map(({ id, ...rest }) => ({...rest, _id: toObjectId(id)})) as any); return { success: true, message: `Data imported to MongoDB collection '${collectionName}' successfully.`}; }

// =================================================================
// DATA MIGRATION & RESET ACTIONS
// =================================================================
export async function migrateCsvToMongo(): Promise<{ success: boolean; message: string; details?: Record<string, number> }> {
  const status = await getDbConnectionStatus();
  if (!status.isConnected) {
    return { success: false, message: `Cannot migrate. MongoDB connection failed: ${status.message}` };
  }

  const results: Record<string, number> = {};

  try {
    const handleMigration = async (collectionName: string, getter: () => Promise<any[]>) => {
      const data = await getter();
      if (data.length > 0) {
        await handleMongoUpload(collectionName, data);
      }
      results[collectionName] = data.length;
    };
    
    const saveJsonSetting = async (collectionName: string, docIdentifier: {type: string}, getter: () => Promise<any>) => {
      const data = await getter();
      const collection = await getCollection<any>(collectionName);
      await collection.updateOne(docIdentifier, { $set: { data } }, { upsert: true });
      results[docIdentifier.type] = 1;
    }

    // Array-based data
    await handleMigration('users', getUsers);
    await handleMigration('menu-items', getMenuItems);
    await handleMigration('orders', getOrders);
    await handleMigration('bookings', getBookings);
    await handleMigration('restaurant-tables', getRestaurantTables);
    await handleMigration('rooms', getRooms);
    await handleMigration('discounts', getDiscounts);
    await handleMigration('offers', getOffers);
    await handleMigration('banners', getBanners);
    await handleMigration('stock-items', getStockItems);
    await handleMigration('expenses', getExpenses);
    await handleMigration('employees', getEmployees);
    await handleMigration('attendance', getAttendanceRecords);
    await handleMigration('salary-payments', getSalaryPayments);
    await handleMigration('feedback', getFeedback);
    await handleMigration('feedback-categories', getFeedbackCategories);
    await handleMigration('printer-settings', getPrinterSettings);
    await handleMigration('role-permissions', getRolePermissions);
    await handleMigration('stock-menu-mappings', getStockMenuMappings);
    await handleMigration('room-stock', () => getRoomStock());
    await handleMigration('managed-images', getManagedImages);
    await handleMigration('menus', getMenus);
    await handleMigration('addon-groups', getAddonGroups);
    await handleMigration('integration-settings', getIntegrationSettings);

    // JSON settings
    await saveJsonSetting('settings', {type: 'general'}, getGeneralSettings);
    await saveJsonSetting('settings', {type: 'notifications'}, getNotificationSettings);
    await saveJsonSetting('settings', {type: 'rateLimit'}, getRateLimitConfig);
    await saveJsonSetting('settings', {type: 'conversionRates'}, getConversionRates);

    return { 
      success: true, 
      message: 'Successfully migrated all CSV data to MongoDB.',
      details: results 
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[MIGRATE_CSV_TO_MONGO] Error: ${errorMessage}`);
    return { 
      success: false, 
      message: `An error occurred during migration: ${errorMessage}`,
      details: results 
    };
  }
}

// Define CSV headers for robust reset
const CSV_HEADERS: Record<string, string[]> = {
  'users.csv': ['id', 'email', 'password', 'role', 'name', 'phone', 'accountStatus', 'loyaltyPoints'],
  'menu-items.csv': ['id', 'name', 'description', 'portionDetails', 'category', 'imageUrl', 'aiHint', 'synonyms', 'isAvailable', 'isSignatureDish', 'isTodaysSpecial', 'isMinibarItem', 'employeeBonusAmount', 'cuisine', 'ingredients', 'dietaryRestrictions', 'recipe', 'preparationMethod', 'prepTime', 'cookTime', 'servings', 'addonGroups', 'calculatedCost', 'calories', 'carbs', 'protein', 'fat', 'energyKJ', 'servingSizeSuggestion'],
  'orders.csv': ['id', 'userId', 'items', 'total', 'status', 'orderType', 'outletId', 'customerName', 'phone', 'email', 'orderTime', 'createdAt', 'bookingId', 'tableNumber', 'paymentType', 'paymentId', 'notes', 'history'],
  'bookings.csv': ['id', 'userId', 'bookingType', 'date', 'time', 'partySize', 'customerName', 'phone', 'email', 'items', 'status', 'requestedResourceId', 'assignedResourceId', 'notes', 'createdAt'],
  'restaurant-tables.csv': ['id', 'name', 'capacity', 'status', 'outletId', 'notes'],
  'rooms.csv': ['id', 'name', 'description', 'capacity', 'pricePerNight', 'amenities', 'imageUrls'],
  'discounts.csv': ['id', 'code', 'type', 'value', 'imageUrl', 'aiHint', 'validFrom', 'validTo', 'usageLimit', 'timesUsed', 'minOrderAmount', 'isActive', 'description', 'outletId'],
  'offers.csv': ['id', 'title', 'description', 'type', 'details', 'imageUrl', 'aiHint', 'validFrom', 'validTo', 'isActive', 'linkedMenuItemIds'],
  'banners.csv': ['id', 'title', 'imageUrl', 'aiHint', 'linkUrl', 'displayOrder', 'isActive', 'validFrom', 'validTo'],
  'stock-items.csv': ['id', 'name', 'category', 'unit', 'currentStock', 'reorderLevel', 'supplier', 'purchasePrice', 'lastPurchaseDate', 'expiryDate'],
  'expenses.csv': ['id', 'date', 'description', 'category', 'amount', 'notes', 'receiptUrl', 'isRecurring', 'recurrenceType', 'recurrenceEndDate'],
  'employees.csv': ['id', 'employeeId', 'name', 'designation', 'baseSalary', 'salaryCalculationType', 'department', 'dateOfJoining', 'mappedUserId'],
  'attendance.csv': ['id', 'employeeId', 'date', 'createdAt', 'checkInTime', 'checkOutTime', 'status', 'notes'],
  'salary-payments.csv': ['id', 'paymentDate', 'periodFrom', 'periodTo', 'employeeId', 'employeeName', 'baseSalaryForPeriod', 'bonusForPeriod', 'deductions', 'netPay'],
  'feedback.csv': ['id', 'rating', 'category', 'comments', 'customerName', 'contactInfo', 'createdAt', 'source'],
  'feedback-categories.csv': ['id', 'name', 'description'],
  'printer-settings.csv': ['id', 'name', 'connectionType', 'ipAddress', 'port', 'paperWidth', 'autoCut', 'linesBeforeCut', 'openCashDrawer', 'dpi'],
  'stock-menu-mappings.csv': ['id', 'stockItemId', 'menuItemId', 'quantityUsedPerServing', 'unitUsed'],
  'room-stock.csv': ['id', 'roomId', 'menuItemId', 'stockQuantity'],
  'managed-images.csv': ['id', 'context', 'entityId', 'imageUrl', 'aiPromptUsed', 'aiHint', 'altText', 'uploadedAt'],
  'menus.csv': ['id', 'name', 'description', 'isActive', 'outletId', 'menuItemIds'],
  'addon-groups.csv': ['id', 'name', 'description', 'addons'],
  'integration-settings.csv': ['id', 'platform', 'isEnabled', 'apiKey', 'otherSettings'],
  'outlets.csv': ['id', 'name', 'type', 'description'],
  'rate-limit-config.csv': ['otpRequestsPerHour', 'otpRequestsPerDay', 'signupAttemptsPerHour', 'signupAttemptsPerDay'],
  'role-permissions.csv': ['roleName', 'allowedRouteIds'],
};

export async function resetAllData(): Promise<{ success: boolean; message: string }> {
  const dataSource = await getDataSource();
  if (dataSource !== 'csv') {
    return { success: false, message: `Data reset is only available for the CSV data source. Current source: ${dataSource}.` };
  }

  try {
    // Thoroughly delete all known CSV files first
    for (const filename in CSV_HEADERS) {
        const filePath = path.join(dataDir, filename);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error; // Rethrow if it's not a "file not found" error
            }
        }
    }
    // Delete known JSON files
     try { await fs.unlink(path.join(dataDir, 'general-settings.json')); } catch (e) { if((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
     try { await fs.unlink(path.join(dataDir, 'notification-settings.json')); } catch (e) { if((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
     try { await fs.unlink(path.join(dataDir, 'conversion-rates.json')); } catch (e) { if((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }


    // Recreate all CSV files with only headers (except where defaults are needed)
    for (const filename in CSV_HEADERS) {
        if (filename === 'users.csv') {
            await writeCsvData('users.csv', [{ id: 'super-admin-1', email: 'super@example.com', password: 'superadminpassword', role: 'superadmin', accountStatus: 'active', name: 'Super Admin', loyaltyPoints: 0 }], CSV_HEADERS['users.csv']);
        } else if (filename === 'feedback-categories.csv') {
            await writeCsvData(filename, defaultFeedbackCategories, CSV_HEADERS[filename]);
        } else if (filename === 'rate-limit-config.csv') {
            await writeCsvData(filename, [defaultRateLimitConfig], CSV_HEADERS[filename]);
        } else if (filename === 'role-permissions.csv') {
            await writeCsvData('role-permissions.csv', [{ roleName: 'superadmin', allowedRouteIds: JSON.stringify(ALL_APPLICATION_ROUTES.map(r => r.id)) }], CSV_HEADERS['role-permissions.csv']);
        } else {
            await writeCsvData(filename, [], CSV_HEADERS[filename]);
        }
    }
    
    // Recreate JSON files with their defaults
    await writeSettingsData('general-settings.json', defaultInvoiceSetupSettings);
    await writeSettingsData('notification-settings.json', defaultNotificationSettings);
    await writeSettingsData('conversion-rates.json', DEFAULT_CONVERSION_RATES);
    await writeSettingsData('daily-availability.json', defaultDailyAvailability); // Also reset daily availability

    console.log('[Data Action] All data files have been reset to their default state.');
    return { success: true, message: 'All application data has been reset successfully.' };

  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[RESET ALL DATA] Error: ${errorMessage}`);
    return { success: false, message: `An error occurred while resetting data: ${errorMessage}` };
  }
}

export async function seedTestData(): Promise<{ success: boolean; message: string }> {
  const dataSource = await getDataSource();
  if (dataSource !== 'csv') {
    return { success: false, message: `Test data seeding is only available for the CSV data source. Current source: ${dataSource}.` };
  }

  try {
    // Reset all data first to ensure a clean slate, preserving the superadmin
    await resetAllData();

    // Users (add more users, superadmin already exists from reset)
    const testUsers: User[] = [
      { id: 'super-admin-1', email: 'super@example.com', password: 'superadminpassword', role: 'superadmin', accountStatus: 'active', name: 'Super Admin', loyaltyPoints: 1000 },
      { id: 'admin-1', email: 'admin@example.com', password: 'adminpassword', role: 'admin', accountStatus: 'active', name: 'Admin User', loyaltyPoints: 0 },
      { id: 'user-1', email: 'user@example.com', password: 'userpassword', role: 'user', accountStatus: 'active', name: 'Regular User', loyaltyPoints: 150 },
      { id: 'user-2', email: 'inactive@example.com', password: 'password', role: 'user', accountStatus: 'inactive', name: 'Inactive User', loyaltyPoints: 0 },
    ];
    await saveUsers(testUsers);

    // Update Role Permissions for new roles
    const testRolePermissions: RolePermission[] = [
        { roleName: 'superadmin', allowedRouteIds: ALL_APPLICATION_ROUTES.map(r => r.id) },
        { roleName: 'admin', allowedRouteIds: ALL_APPLICATION_ROUTES.filter(r => r.id.startsWith('admin_')).map(r => r.id) },
        { roleName: 'user', allowedRouteIds: ALL_APPLICATION_ROUTES.filter(r => r.group === 'General').map(r => r.id) },
    ];
    await saveRolePermissions(testRolePermissions);


    // Menu Items
    const testMenuItems: MenuItem[] = [
        { id: 'item-1', name: 'Margherita Pizza', description: 'Classic pizza with tomatoes, mozzarella, and basil.', portionDetails: JSON.stringify([{name: '12-inch', price: 250, isDefault: true}]), category: 'Main Course', imageUrl: 'https://placehold.co/600x400.png', isAvailable: true, ingredients: 'Flour, Tomatoes, Mozzarella, Basil', cuisine: 'Italian' },
        { id: 'item-2', name: 'Caesar Salad', description: 'Crisp romaine lettuce with Caesar dressing and croutons.', portionDetails: JSON.stringify([{name: 'Regular', price: 150, isDefault: true}, {name: 'Large', price: 220}]), category: 'Appetizer', imageUrl: 'https://placehold.co/600x400.png', isAvailable: true, ingredients: 'Romaine Lettuce, Croutons, Parmesan', cuisine: 'American' },
        { id: 'item-3', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a gooey center.', portionDetails: JSON.stringify([{name: 'fixed', price: 180, isDefault: true}]), category: 'Dessert', imageUrl: 'https://placehold.co/600x400.png', isAvailable: false, ingredients: 'Chocolate, Flour, Sugar, Eggs', cuisine: 'Dessert' },
    ];
    await saveMenuItemChanges(testMenuItems);

    // Tables
    const testTables: RestaurantTable[] = [
      { id: 't1', name: 'Table 1', capacity: 4, status: 'Available' },
      { id: 't2', name: 'Table 2', capacity: 2, status: 'Occupied' },
      { id: 't3', name: 'Booth 1', capacity: 6, status: 'Reserved' },
    ];
    await saveRestaurantTables(testTables);
    
    // Rooms
    const testRooms: Room[] = [
      { id: 'r1', name: 'King Suite', capacity: 2, pricePerNight: 5000, amenities: 'Wi-Fi, TV, AC', description: 'A luxurious suite.', imageUrls: 'https://placehold.co/800x600.png' },
      { id: 'r2', name: 'Double Room', capacity: 4, pricePerNight: 3500, amenities: 'Wi-Fi, TV', description: 'A comfortable room for families.', imageUrls: 'https://placehold.co/800x600.png' },
    ];
    await saveRooms(testRooms);
    
    // Orders
    const testOrders: Order[] = [
      { id: 'ord-1', userId: 'user-1', items: JSON.stringify([{menuItemId: 'item-1', name: 'Margherita Pizza', quantity: 1, price: 250, selectedPortion: '12-inch'}]), total: 250, status: 'Completed', orderType: 'Dine-in', customerName: 'Regular User', createdAt: new Date().toISOString(), tableNumber: 't2', paymentType: 'Card' },
      { id: 'ord-2', items: JSON.stringify([{menuItemId: 'item-2', name: 'Caesar Salad', quantity: 2, price: 150, selectedPortion: 'Regular'}]), total: 300, status: 'Preparing', orderType: 'Takeaway', customerName: 'Walk-in Guest', createdAt: new Date().toISOString() },
    ];
    await saveOrders(testOrders);

    // Bookings
    const testBookings: Booking[] = [
        { id: 'bk-1', userId: 'user-1', bookingType: 'table', date: new Date().toISOString().split('T')[0], time: '19:00', partySize: 2, customerName: 'Regular User', phone: '1234567890', status: 'confirmed', assignedResourceId: 't3' },
    ];
    await saveBookings(testBookings);

    console.log('[Data Action] All modules have been seeded with test data.');
    return { success: true, message: 'Test data seeded successfully.' };

  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[SEED TEST DATA] Error: ${errorMessage}`);
    return { success: false, message: `An error occurred while seeding data: ${errorMessage}` };
  }
}
