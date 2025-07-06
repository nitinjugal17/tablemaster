
'use server';

// This file acts as a dynamic dispatcher for data management actions.
// It checks the DATA_SOURCE environment variable and, if set to 'mongodb',
// verifies the connection. If the connection fails, it gracefully falls back
// to the CSV implementation to prevent application crashes.

import * as csv from './csv';
import * as mongo from './mongodb';

// Import getDbStatus directly from the source to avoid circular dependency issues.
// This is the most reliable way to check the MongoDB connection status.
import { getDbStatus } from '@/lib/mongodb';

let useMongoDb: boolean | null = null;
let dbStatusChecked = false;

/**
 * Determines whether to use MongoDB based on environment variables and connection status.
 * Caches the result for a request's lifecycle to avoid redundant checks.
 * @returns {Promise<boolean>} - True if MongoDB should be used, false otherwise.
 */
async function shouldUseMongo(): Promise<boolean> {
  // If DATA_SOURCE is not 'mongodb', always use CSV.
  if (process.env.DATA_SOURCE !== 'mongodb') {
    return false;
  }

  // Use the cached result if the check has already been performed.
  if (dbStatusChecked && useMongoDb !== null) {
    return useMongoDb;
  }

  console.log('[Data Dispatcher] DATA_SOURCE is "mongodb". Checking connection status...');
  const status = await getDbStatus();
  useMongoDb = status.isConnected;
  dbStatusChecked = true; // Mark that we've performed the check.

  if (useMongoDb) {
    console.log('[Data Dispatcher] MongoDB connection is active. Using MongoDB as the data source.');
  } else {
    console.warn(`[Data Dispatcher] WARN: MongoDB connection failed: "${status.message}". Falling back to CSV as the data source.`);
  }

  return useMongoDb;
}

// --- Menu Items ---
export async function getMenuItems(...args: Parameters<typeof csv.getMenuItems>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getMenuItems(...args) : csv.getMenuItems(...args);
}
export async function saveMenuItemChanges(...args: Parameters<typeof csv.saveMenuItemChanges>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveMenuItemChanges(...args) : csv.saveMenuItemChanges(...args);
}
export async function downloadMenuItemsCsv(...args: Parameters<typeof csv.downloadMenuItemsCsv>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.downloadMenuItemsCsv(...args) : csv.downloadMenuItemsCsv(...args);
}
export async function uploadMenuItemsCsv(...args: Parameters<typeof csv.uploadMenuItemsCsv>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.uploadMenuItemsCsv(...args) : csv.uploadMenuItemsCsv(...args);
}

// --- Menus ---
export async function getMenus(...args: Parameters<typeof csv.getMenus>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getMenus(...args) : csv.getMenus(...args);
}
export async function saveMenus(...args: Parameters<typeof csv.saveMenus>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveMenus(...args) : csv.saveMenus(...args);
}
export async function downloadMenusCsv(...args: Parameters<typeof csv.downloadMenusCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadMenusCsv(...args) : csv.downloadMenusCsv(...args);
}
export async function uploadMenusCsv(...args: Parameters<typeof csv.uploadMenusCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadMenusCsv(...args) : csv.uploadMenusCsv(...args);
}

// --- Addon Groups ---
export async function getAddonGroups(...args: Parameters<typeof csv.getAddonGroups>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getAddonGroups(...args) : csv.getAddonGroups(...args);
}
export async function saveAddonGroups(...args: Parameters<typeof csv.saveAddonGroups>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveAddonGroups(...args) : csv.saveAddonGroups(...args);
}
export async function downloadAddonGroupsCsv(...args: Parameters<typeof csv.downloadAddonGroupsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadAddonGroupsCsv(...args) : csv.downloadAddonGroupsCsv(...args);
}
export async function uploadAddonGroupsCsv(...args: Parameters<typeof csv.uploadAddonGroupsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadAddonGroupsCsv(...args) : csv.uploadAddonGroupsCsv(...args);
}

// --- Orders ---
export async function getOrders(...args: Parameters<typeof csv.getOrders>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getOrders(...args) : csv.getOrders(...args);
}
export async function saveOrders(...args: Parameters<typeof csv.saveOrders>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveOrders(...args) : csv.saveOrders(...args);
}
export async function downloadOrdersCsv(...args: Parameters<typeof csv.downloadOrdersCsv>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.downloadOrdersCsv(...args) : csv.downloadOrdersCsv(...args);
}
export async function uploadOrdersCsv(...args: Parameters<typeof csv.uploadOrdersCsv>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.uploadOrdersCsv(...args) : csv.uploadOrdersCsv(...args);
}

// --- Users ---
export async function getUsers(...args: Parameters<typeof csv.getUsers>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getUsers(...args) : csv.getUsers(...args);
}
export async function saveUsers(...args: Parameters<typeof csv.saveUsers>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveUsers(...args) : csv.saveUsers(...args);
}
export async function downloadUsersCsv(...args: Parameters<typeof csv.downloadUsersCsv>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.downloadUsersCsv(...args) : csv.downloadUsersCsv(...args);
}
export async function uploadUsersCsv(...args: Parameters<typeof csv.uploadUsersCsv>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.uploadUsersCsv(...args) : csv.uploadUsersCsv(...args);
}

// --- Currency Rates ---
export async function getConversionRates(...args: Parameters<typeof csv.getConversionRates>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getConversionRates(...args) : csv.getConversionRates(...args);
}
export async function saveConversionRates(...args: Parameters<typeof csv.saveConversionRates>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveConversionRates(...args) : csv.saveConversionRates(...args);
}
export async function downloadConversionRatesCsv(...args: Parameters<typeof csv.downloadConversionRatesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadConversionRatesCsv(...args) : csv.downloadConversionRatesCsv(...args);
}
export async function uploadConversionRatesCsv(...args: Parameters<typeof csv.uploadConversionRatesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadConversionRatesCsv(...args) : csv.uploadConversionRatesCsv(...args);
}


// --- Notification Settings ---
export async function getNotificationSettings(...args: Parameters<typeof csv.getNotificationSettings>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.getNotificationSettings(...args) : csv.getNotificationSettings(...args);
}
export async function saveNotificationSettings(...args: Parameters<typeof csv.saveNotificationSettings>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.saveNotificationSettings(...args) : csv.saveNotificationSettings(...args);
}


// --- General Settings ---
export async function getGeneralSettings(...args: Parameters<typeof csv.getGeneralSettings>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getGeneralSettings(...args) : csv.getGeneralSettings(...args);
}
export async function saveGeneralSettings(...args: Parameters<typeof csv.saveGeneralSettings>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveGeneralSettings(...args) : csv.saveGeneralSettings(...args);
}
export async function downloadGeneralSettingsCsv(...args: Parameters<typeof csv.downloadGeneralSettingsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadGeneralSettingsCsv(...args) : csv.downloadGeneralSettingsCsv(...args);
}
export async function uploadGeneralSettingsCsv(...args: Parameters<typeof csv.uploadGeneralSettingsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadGeneralSettingsCsv(...args) : csv.uploadGeneralSettingsCsv(...args);
}

// --- Printer Settings ---
export async function getPrinterSettings(...args: Parameters<typeof csv.getPrinterSettings>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getPrinterSettings(...args) : csv.getPrinterSettings(...args);
}
export async function savePrinterSettings(...args: Parameters<typeof csv.savePrinterSettings>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.savePrinterSettings(...args) : csv.savePrinterSettings(...args);
}
export async function downloadPrinterSettingsCsv(...args: Parameters<typeof csv.downloadPrinterSettingsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadPrinterSettingsCsv(...args) : csv.downloadPrinterSettingsCsv(...args);
}
export async function uploadPrinterSettingsCsv(...args: Parameters<typeof csv.uploadPrinterSettingsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadPrinterSettingsCsv(...args) : csv.uploadPrinterSettingsCsv(...args);
}

// --- Bookings ---
export async function getBookings(...args: Parameters<typeof csv.getBookings>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getBookings(...args) : csv.getBookings(...args);
}
export async function saveBookings(...args: Parameters<typeof csv.saveBookings>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveBookings(...args) : csv.saveBookings(...args);
}
export async function downloadBookingsCsv(...args: Parameters<typeof csv.downloadBookingsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadBookingsCsv(...args) : csv.downloadBookingsCsv(...args);
}
export async function uploadBookingsCsv(...args: Parameters<typeof csv.uploadBookingsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadBookingsCsv(...args) : csv.uploadBookingsCsv(...args);
}

// --- Restaurant Tables ---
export async function getRestaurantTables(...args: Parameters<typeof csv.getRestaurantTables>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getRestaurantTables(...args) : csv.getRestaurantTables(...args);
}
export async function saveRestaurantTables(...args: Parameters<typeof csv.saveRestaurantTables>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveRestaurantTables(...args) : csv.saveRestaurantTables(...args);
}
export async function downloadRestaurantTablesCsv(...args: Parameters<typeof csv.downloadRestaurantTablesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadRestaurantTablesCsv(...args) : csv.downloadRestaurantTablesCsv(...args);
}
export async function uploadRestaurantTablesCsv(...args: Parameters<typeof csv.uploadRestaurantTablesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadRestaurantTablesCsv(...args) : csv.uploadRestaurantTablesCsv(...args);
}

// --- Rooms ---
export async function getRooms(...args: Parameters<typeof csv.getRooms>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getRooms(...args) : csv.getRooms(...args);
}
export async function saveRooms(...args: Parameters<typeof csv.saveRooms>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveRooms(...args) : csv.saveRooms(...args);
}
export async function downloadRoomsCsv(...args: Parameters<typeof csv.downloadRoomsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadRoomsCsv(...args) : csv.downloadRoomsCsv(...args);
}
export async function uploadRoomsCsv(...args: Parameters<typeof csv.uploadRoomsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadRoomsCsv(...args) : csv.uploadRoomsCsv(...args);
}

// --- Room Stock ---
export async function getRoomStock(...args: Parameters<typeof csv.getRoomStock>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.getRoomStock(...args) : csv.getRoomStock(...args);
}
export async function saveRoomStock(...args: Parameters<typeof csv.saveRoomStock>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.saveRoomStock(...args) : csv.saveRoomStock(...args);
}
export async function downloadRoomStockCsv(...args: Parameters<typeof csv.downloadRoomStockCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadRoomStockCsv(...args) : csv.downloadRoomStockCsv(...args);
}
export async function uploadRoomStockCsv(...args: Parameters<typeof csv.uploadRoomStockCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadRoomStockCsv(...args) : csv.uploadRoomStockCsv(...args);
}

// --- Role Permissions ---
export async function getRolePermissions(...args: Parameters<typeof csv.getRolePermissions>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getRolePermissions(...args) : csv.getRolePermissions(...args);
}
export async function saveRolePermissions(...args: Parameters<typeof csv.saveRolePermissions>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveRolePermissions(...args) : csv.saveRolePermissions(...args);
}
export async function downloadRolePermissionsCsv(...args: Parameters<typeof csv.downloadRolePermissionsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadRolePermissionsCsv(...args) : csv.downloadRolePermissionsCsv(...args);
}
export async function uploadRolePermissionsCsv(...args: Parameters<typeof csv.uploadRolePermissionsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadRolePermissionsCsv(...args) : csv.uploadRolePermissionsCsv(...args);
}

// --- Discounts ---
export async function getDiscounts(...args: Parameters<typeof csv.getDiscounts>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getDiscounts(...args) : csv.getDiscounts(...args);
}
export async function saveDiscounts(...args: Parameters<typeof csv.saveDiscounts>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveDiscounts(...args) : csv.saveDiscounts(...args);
}
export async function downloadDiscountsCsv(...args: Parameters<typeof csv.downloadDiscountsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadDiscountsCsv(...args) : csv.downloadDiscountsCsv(...args);
}
export async function uploadDiscountsCsv(...args: Parameters<typeof csv.uploadDiscountsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadDiscountsCsv(...args) : csv.uploadDiscountsCsv(...args);
}

// --- Offers ---
export async function getOffers(...args: Parameters<typeof csv.getOffers>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getOffers(...args) : csv.getOffers(...args);
}
export async function saveOffers(...args: Parameters<typeof csv.saveOffers>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveOffers(...args) : csv.saveOffers(...args);
}
export async function downloadOffersCsv(...args: Parameters<typeof csv.downloadOffersCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadOffersCsv(...args) : csv.downloadOffersCsv(...args);
}
export async function uploadOffersCsv(...args: Parameters<typeof csv.uploadOffersCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadOffersCsv(...args) : csv.uploadOffersCsv(...args);
}

// --- Banners ---
export async function getBanners(...args: Parameters<typeof csv.getBanners>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getBanners(...args) : csv.getBanners(...args);
}
export async function saveBanners(...args: Parameters<typeof csv.saveBanners>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveBanners(...args) : csv.saveBanners(...args);
}
export async function downloadBannersCsv(...args: Parameters<typeof csv.downloadBannersCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadBannersCsv(...args) : csv.downloadBannersCsv(...args);
}
export async function uploadBannersCsv(...args: Parameters<typeof csv.uploadBannersCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadBannersCsv(...args) : csv.uploadBannersCsv(...args);
}

// --- Managed Images ---
export async function getManagedImages(...args: Parameters<typeof csv.getManagedImages>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getManagedImages(...args) : csv.getManagedImages(...args);
}
export async function saveManagedImages(...args: Parameters<typeof csv.saveManagedImages>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveManagedImages(...args) : csv.saveManagedImages(...args);
}
export async function downloadManagedImagesCsv(...args: Parameters<typeof csv.downloadManagedImagesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadManagedImagesCsv(...args) : csv.downloadManagedImagesCsv(...args);
}
export async function uploadManagedImagesCsv(...args: Parameters<typeof csv.uploadManagedImagesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadManagedImagesCsv(...args) : csv.uploadManagedImagesCsv(...args);
}

// --- Stock Items ---
export async function getStockItems(...args: Parameters<typeof csv.getStockItems>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getStockItems(...args) : csv.getStockItems(...args);
}
export async function saveStockItems(...args: Parameters<typeof csv.saveStockItems>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveStockItems(...args) : csv.saveStockItems(...args);
}
export async function downloadStockItemsCsv(...args: Parameters<typeof csv.downloadStockItemsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadStockItemsCsv(...args) : csv.downloadStockItemsCsv(...args);
}
export async function uploadStockItemsCsv(...args: Parameters<typeof csv.uploadStockItemsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadStockItemsCsv(...args) : csv.uploadStockItemsCsv(...args);
}

// --- Expenses ---
export async function getExpenses(...args: Parameters<typeof csv.getExpenses>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getExpenses(...args) : csv.getExpenses(...args);
}
export async function saveExpenses(...args: Parameters<typeof csv.saveExpenses>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveExpenses(...args) : csv.saveExpenses(...args);
}
export async function downloadExpensesCsv(...args: Parameters<typeof csv.downloadExpensesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadExpensesCsv(...args) : csv.downloadExpensesCsv(...args);
}
export async function uploadExpensesCsv(...args: Parameters<typeof csv.uploadExpensesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadExpensesCsv(...args) : csv.uploadExpensesCsv(...args);
}

// --- Stock Menu Mappings ---
export async function getStockMenuMappings(...args: Parameters<typeof csv.getStockMenuMappings>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getStockMenuMappings(...args) : csv.getStockMenuMappings(...args);
}
export async function saveStockMenuMappings(...args: Parameters<typeof csv.saveStockMenuMappings>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveStockMenuMappings(...args) : csv.saveStockMenuMappings(...args);
}
export async function downloadStockMenuMappingsCsv(...args: Parameters<typeof csv.downloadStockMenuMappingsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadStockMenuMappingsCsv(...args) : csv.downloadStockMenuMappingsCsv(...args);
}
export async function uploadStockMenuMappingsCsv(...args: Parameters<typeof csv.uploadStockMenuMappingsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadStockMenuMappingsCsv(...args) : csv.uploadStockMenuMappingsCsv(...args);
}

// --- Rate Limit Config ---
export async function getRateLimitConfig(...args: Parameters<typeof csv.getRateLimitConfig>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getRateLimitConfig(...args) : csv.getRateLimitConfig(...args);
}
export async function saveRateLimitConfig(...args: Parameters<typeof csv.saveRateLimitConfig>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveRateLimitConfig(...args) : csv.saveRateLimitConfig(...args);
}
export async function downloadRateLimitConfigCsv(...args: Parameters<typeof csv.downloadRateLimitConfigCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadRateLimitConfigCsv(...args) : csv.downloadRateLimitConfigCsv(...args);
}
export async function uploadRateLimitConfigCsv(...args: Parameters<typeof csv.uploadRateLimitConfigCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadRateLimitConfigCsv(...args) : csv.uploadRateLimitConfigCsv(...args);
}

// --- Employees ---
export async function getEmployees(...args: Parameters<typeof csv.getEmployees>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getEmployees(...args) : csv.getEmployees(...args);
}
export async function saveEmployees(...args: Parameters<typeof csv.saveEmployees>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveEmployees(...args) : csv.saveEmployees(...args);
}
export async function downloadEmployeesCsv(...args: Parameters<typeof csv.downloadEmployeesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadEmployeesCsv(...args) : csv.downloadEmployeesCsv(...args);
}
export async function uploadEmployeesCsv(...args: Parameters<typeof csv.uploadEmployeesCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadEmployeesCsv(...args) : csv.uploadEmployeesCsv(...args);
}

// --- Attendance ---
export async function getAttendanceRecords(...args: Parameters<typeof csv.getAttendanceRecords>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getAttendanceRecords(...args) : csv.getAttendanceRecords(...args);
}
export async function saveAttendanceRecords(...args: Parameters<typeof csv.saveAttendanceRecords>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveAttendanceRecords(...args) : csv.saveAttendanceRecords(...args);
}
export async function downloadAttendanceRecordsCsv(...args: Parameters<typeof csv.downloadAttendanceRecordsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.downloadAttendanceRecordsCsv(...args) : csv.downloadAttendanceRecordsCsv(...args);
}
export async function uploadAttendanceRecordsCsv(...args: Parameters<typeof csv.uploadAttendanceRecordsCsv>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.uploadAttendanceRecordsCsv(...args) : csv.uploadAttendanceRecordsCsv(...args);
}


// --- Salary Payments ---
export async function getSalaryPayments(...args: Parameters<typeof csv.getSalaryPayments>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.getSalaryPayments(...args) : csv.getSalaryPayments(...args);
}
export async function saveSalaryPayments(...args: Parameters<typeof csv.saveSalaryPayments>) {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.saveSalaryPayments(...args) : csv.saveSalaryPayments(...args);
}

// --- Feedback Categories ---
export async function getFeedbackCategories(...args: Parameters<typeof csv.getFeedbackCategories>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getFeedbackCategories(...args) : csv.getFeedbackCategories(...args);
}
export async function saveFeedbackCategories(...args: Parameters<typeof csv.saveFeedbackCategories>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveFeedbackCategories(...args) : csv.saveFeedbackCategories(...args);
}

// --- Feedback ---
export async function getFeedback(...args: Parameters<typeof csv.getFeedback>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.getFeedback(...args) : csv.getFeedback(...args);
}
export async function saveFeedback(...args: Parameters<typeof csv.saveFeedback>) {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.saveFeedback(...args) : csv.saveFeedback(...args);
}


// --- Data Source Status ---
export async function getDataSource() {
    const useMongo = await shouldUseMongo();
    return useMongo ? mongo.getDataSource() : csv.getDataSource();
}
export async function getDbConnectionStatus() {
    // This now directly reflects the fallback logic's result.
    const useMongo = await shouldUseMongo();
    if (useMongo) {
        return mongo.getDbConnectionStatus();
    }
    return { isConnected: false, message: 'Using CSV fallback due to MongoDB connection issue or configuration.' };
}

// --- System Readiness Check ---
export async function checkSystemReady(): Promise<{ isReady: boolean; message?: string }> {
  const useMongo = await shouldUseMongo();
  return useMongo ? mongo.checkSystemReady() : csv.checkSystemReady();
}


// --- Encryption Status (CSV only) ---
export async function getEncryptionStatus(...args: Parameters<typeof csv.getEncryptionStatus>) {
  return csv.getEncryptionStatus(...args); // This is specific to the CSV implementation
}
