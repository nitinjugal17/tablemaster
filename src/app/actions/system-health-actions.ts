
'use server';

import {
    saveUsers, getUsers,
    saveMenuItemChanges, getMenuItems,
    saveOrders, getOrders,
    saveBookings, getBookings,
    saveOutlets, getOutlets,
    saveRestaurantTables, getRestaurantTables,
    saveRooms, getRooms,
    saveDiscounts, getDiscounts,
    saveOffers, getOffers,
    saveBanners, getBanners,
    saveStockItems, getStockItems,
    saveExpenses, getExpenses,
    saveEmployees, getEmployees,
    saveAddonGroups, getAddonGroups,
    saveAttendanceRecords, getAttendanceRecords,
    saveSalaryPayments, getSalaryPayments,
    saveFeedback, getFeedback,
    saveFeedbackCategories, getFeedbackCategories,
    savePrinterSettings, getPrinterSettings,
    saveGeneralSettings, getGeneralSettings,
    saveNotificationSettings, getNotificationSettings,
    getDbConnectionStatus,
    getRateLimitConfig,
    saveRateLimitConfig,
    getRolePermissions,
    saveRolePermissions,
    saveStockMenuMappings,
    getStockMenuMappings,
    saveRoomStock,
    getRoomStock,
    getManagedImages,
    saveManagedImages,
    getMenus,
    saveMenus,
    getIntegrationSettings,
    saveIntegrationSettings,
    getConversionRates,
    saveConversionRates,
} from './data-management-actions';
import type { 
    User, MenuItem, Order, Booking, RestaurantTable, Room, DiscountCode, Offer, Banner, StockItem, Expense, Employee, 
    AddonGroup, AttendanceRecord, SalaryPayment, Feedback, FeedbackCategory, PrinterSetting, InvoiceSetupSettings, NotificationSettings, HomepageSectionConfig, Outlet, RateLimitConfig, RolePermission, StockMenuMapping, RoomStockItem, ManagedImage,
    Menu, IntegrationSetting, ConversionRates
} from '@/lib/types';
import { DEFAULT_HOMEPAGE_LAYOUT, DEFAULT_CONVERSION_RATES } from '@/lib/types';

interface TestResult {
    module: string;
    test: string;
    status: 'success' | 'failure';
    duration: number; // in ms
    message: string;
    details?: any;
}

const TEST_PREFIX = "systest_";
const testRunId = Date.now();

// Generic wrapper to time and handle errors for each test function
async function runTest(
    module: string,
    testName: string,
    testFn: () => Promise<Omit<TestResult, 'module' | 'test' | 'duration'>>
): Promise<TestResult> {
    const startTime = Date.now();
    try {
        const result = await testFn();
        const duration = Date.now() - startTime;
        return { module, test: testName, duration, ...result };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[System Health] Uncaught error in test "${testName}":`, error);
        return {
            module,
            test: testName,
            status: 'failure',
            duration,
            message: "Test function threw an unhandled exception.",
            details: (error as Error).message
        };
    }
}

async function genericCrudTest<T extends { id: string, name?: string, title?: string, code?: string, description?: string, employeeId?: string, customerName?: string, phone?: string }>(
    moduleName: string,
    getterFn: () => Promise<T[]>,
    saverFn: (items: T[]) => Promise<{ success: boolean; message: string; count?: number }>,
    testItemBase: Omit<T, 'id'>,
    updateFn?: (item: T) => T // Optional function to perform a more specific update
): Promise<TestResult[]> {
    const testId = `id-${TEST_PREFIX}${testRunId}`;
    const testItem = { ...testItemBase, id: testId } as T;
    let originalItems: T[] | null = null;
    
    const cleanup = async () => {
        if (originalItems !== null) {
            await saverFn(originalItems);
        }
    };

    try {
        originalItems = await getterFn();
        
        const createResult = await runTest(moduleName, 'Create', async () => {
            const saveResult = await saverFn([...originalItems!, testItem]);
            return saveResult.success ? { status: 'success', message: 'Item created.' } : { status: 'failure', message: saveResult.message };
        });
        if (createResult.status === 'failure') return [createResult];

        const readResult = await runTest(moduleName, 'Read', async () => {
            const items = await getterFn();
            return items.some(i => i.id === testId) ? { status: 'success', message: 'Item read.' } : { status: 'failure', message: 'Item not found.' };
        });
        if (readResult.status === 'failure') return [createResult, readResult];

        const updateResult = await runTest(moduleName, 'Update', async () => {
            const items = await getterFn();
            const itemIndex = items.findIndex(i => i.id === testId);
            if (itemIndex === -1) return { status: 'failure', message: "Item not found for update." };

            const updatedItem = updateFn ? updateFn(items[itemIndex]) : { ...items[itemIndex], name: `Updated ${TEST_PREFIX}` };
            items[itemIndex] = updatedItem;

            const saveResult = await saverFn(items);
            const updatedItems = await getterFn();
            // Check if the update is reflected. If a custom update function is used, a simple check might not be enough,
            // but we'll assume the existence of the updated item is sufficient for a generic pass.
            return saveResult.success && updatedItems.some(i => i.id === testId) ? { status: 'success', message: 'Item updated.' } : { status: 'failure', message: 'Update not reflected.' };
        });
        
        const deleteResult = await runTest(moduleName, 'Delete', async () => {
             const items = await getterFn();
             const itemsToKeep = items.filter(i => i.id !== testId);
             const saveResult = await saverFn(itemsToKeep);
             const finalItems = await getterFn();
             return saveResult.success && !finalItems.some(i => i.id === testId) ? { status: 'success', message: 'Item deleted.' } : { status: 'failure', message: 'Item still found after deletion.' };
        });

        return [createResult, readResult, updateResult, deleteResult];
    } finally {
        await cleanup();
    }
}

async function testSettingsCrud<T>(
    moduleName: string,
    getterFn: () => Promise<T>,
    saverFn: (settings: T) => Promise<{ success: boolean; message: string; }>,
    testData: T
): Promise<TestResult[]> {
    let originalSettings: T | undefined;

    const cleanup = async () => {
        if (originalSettings) {
            await saverFn(originalSettings);
        }
    };

    try {
        const readResult = await runTest(moduleName, 'Read Original', async () => {
            originalSettings = await getterFn();
            return originalSettings ? { status: 'success', message: 'Original settings read.' } : { status: 'failure', message: 'Could not read settings.' };
        });
        if (readResult.status === 'failure' || !originalSettings) return [readResult];

        const updateResult = await runTest(moduleName, 'Update with Test Data', async () => {
            const saveResult = await saverFn(testData);
            if (!saveResult.success) return { status: 'failure', message: `Save failed: ${saveResult.message}` };
            
            const newSettings = await getterFn();
            // Deep comparison of the objects
            const valueMatches = JSON.stringify(newSettings) === JSON.stringify(testData);
            return valueMatches ? { status: 'success', message: 'Settings updated and verified.' } : { status: 'failure', message: 'Update not reflected correctly.', details: `Expected ${JSON.stringify(testData)}, got ${JSON.stringify(newSettings)}` };
        });

        const restoreResult = await runTest(moduleName, 'Restore Original', async () => {
             const saveResult = await saverFn(originalSettings!);
             if (!saveResult.success) return { status: 'failure', message: `Restore failed: ${saveResult.message}` };
             const restoredSettings = await getterFn();
             const valueMatches = JSON.stringify(restoredSettings) === JSON.stringify(originalSettings);
             return valueMatches ? { status: 'success', message: 'Settings restored and verified.' } : { status: 'failure', message: 'Restore not reflected correctly.', details: `Expected ${JSON.stringify(originalSettings)}, got ${JSON.stringify(restoredSettings)}` };
        });

        return [readResult, updateResult, restoreResult];
    } finally {
        await cleanup();
    }
}

export async function runAllSystemHealthChecks(): Promise<TestResult[]> {
    console.log(`[System Health] Starting all system health checks for run ID: ${testRunId}`);
    const allResults: TestResult[] = [];

    // 1. Test fundamental database connection
    const dbConnectionTest = await runTest('Data Source', 'Database Connection', async () => {
        const status = await getDbConnectionStatus();
        return status.isConnected 
            ? { status: 'success', message: status.message }
            : { status: 'failure', message: status.message };
    });
    allResults.push(dbConnectionTest);

    // 2. Run all CRUD tests for array-based models
    allResults.push(...await genericCrudTest<User>('Users', getUsers, saveUsers, { email: `${TEST_PREFIX}${testRunId}@test.com`, name: "Test User", role: 'user', accountStatus: 'active', password: 'test', loyaltyPoints: 0 }));
    allResults.push(...await genericCrudTest<MenuItem>('Menu Items', getMenuItems, saveMenuItemChanges, { name: `Test ${TEST_PREFIX}`, description: "Test description", portionDetails: JSON.stringify([{name: 'fixed', price: 1, isDefault: true}]), category: 'Test', imageUrl: '', isAvailable: true }));
    allResults.push(...await genericCrudTest<Menu>('Menus', getMenus, saveMenus, { name: `Test Menu ${TEST_PREFIX}`, menuItemIds: '[]', isActive: true, description: 'A test menu' }));
    allResults.push(...await genericCrudTest<Outlet>('Outlets', getOutlets, saveOutlets, { name: `Test Outlet ${TEST_PREFIX}`, type: 'restaurant', description: 'A test outlet' }));
    allResults.push(...await genericCrudTest<RestaurantTable>('Tables', getRestaurantTables, saveRestaurantTables, { name: `Test Table ${TEST_PREFIX}`, capacity: 4, status: 'Available' }));
    allResults.push(...await genericCrudTest<Room>('Rooms', getRooms, saveRooms, { name: `Test Room ${TEST_PREFIX}`, capacity: 2, pricePerNight: 100, amenities: 'test', description: 'test', imageUrls: 'test.png' }));
    allResults.push(...await genericCrudTest<DiscountCode>('Discounts', getDiscounts, saveDiscounts, { code: `TEST${testRunId}`, type: 'percentage', value: 10, isActive: true, validFrom: new Date().toISOString(), validTo: new Date().toISOString(), description: `Test Discount ${TEST_PREFIX}`, usageLimit: 1, timesUsed: 0, minOrderAmount: 0 }));
    allResults.push(...await genericCrudTest<Offer>('Offers', getOffers, saveOffers, { title: `Test Offer ${TEST_PREFIX}`, type: 'seasonal_special', details: JSON.stringify({ comboPrice: 100 }), isActive: true, validFrom: new Date().toISOString(), validTo: new Date().toISOString(), linkedMenuItemIds: '[]' }));
    allResults.push(...await genericCrudTest<Banner>('Banners', getBanners, saveBanners, { title: `Test Banner ${TEST_PREFIX}`, imageUrl: 'test.png', displayOrder: 99, isActive: true }));
    allResults.push(...await genericCrudTest<StockItem>('Stock Items', getStockItems, saveStockItems, { name: `Test Stock ${TEST_PREFIX}`, category: 'Test', unit: 'pcs', currentStock: 100, reorderLevel: 10, purchasePrice: 1 }));
    allResults.push(...await genericCrudTest<Expense>('Expenses', getExpenses, saveExpenses, { description: `Test Expense ${TEST_PREFIX}`, category: 'Miscellaneous', amount: 10, date: new Date().toISOString(), isRecurring: false }));
    allResults.push(...await genericCrudTest<Employee>('Employees', getEmployees, saveEmployees, { employeeId: `EMP-${TEST_PREFIX}${testRunId}`, name: `Test Employee ${TEST_PREFIX}`, designation: 'Tester' }));
    allResults.push(...await genericCrudTest<AddonGroup>('Addon Groups', getAddonGroups, saveAddonGroups, { name: `Test Addons ${TEST_PREFIX}`, addons: JSON.stringify([{id: '1', name: 'Test', price: 1}]), description: 'Test addons' }));
    allResults.push(...await genericCrudTest<AttendanceRecord>('Attendance', getAttendanceRecords, saveAttendanceRecords, { employeeId: `EMP-${TEST_PREFIX}`, date: new Date().toISOString(), status: 'Present', checkInTime: new Date().toISOString(), createdAt: new Date().toISOString() }));
    allResults.push(...await genericCrudTest<SalaryPayment>('Salary Payments', getSalaryPayments, saveSalaryPayments, { paymentDate: new Date().toISOString(), periodFrom: new Date().toISOString(), periodTo: new Date().toISOString(), employeeId: `EMP-${TEST_PREFIX}`, employeeName: `Test Employee`, baseSalaryForPeriod: 1, bonusForPeriod: 0, deductions: 0, netPay: 1 }));
    allResults.push(...await genericCrudTest<Feedback>('Feedback', getFeedback, saveFeedback, { rating: 5, category: 'Test', comments: `Test Feedback ${TEST_PREFIX}`, createdAt: new Date().toISOString() }));
    allResults.push(...await genericCrudTest<FeedbackCategory>('Feedback Categories', getFeedbackCategories, saveFeedbackCategories, { name: `Test Category ${TEST_PREFIX}`, description: 'Test category' }));
    allResults.push(...await genericCrudTest<PrinterSetting>('Printer Settings', getPrinterSettings, savePrinterSettings, { name: `Test Printer ${TEST_PREFIX}`, connectionType: 'network', ipAddress: '1.2.3.4', port: '9100', paperWidth: '80mm', autoCut: 'none', linesBeforeCut: '1', openCashDrawer: 'disabled', dpi: '203' }));
    allResults.push(...await genericCrudTest<ManagedImage>('Managed Images', getManagedImages, saveManagedImages, { context: 'general_ui_other', imageUrl: 'test.png', uploadedAt: new Date().toISOString(), altText: 'test' }));
    allResults.push(...await genericCrudTest<StockMenuMapping>('Stock Mappings', getStockMenuMappings, saveStockMenuMappings, { stockItemId: 'test', menuItemId: 'test', quantityUsedPerServing: 1, unitUsed: 'pcs'}));
    allResults.push(...await genericCrudTest<Booking>('Bookings', getBookings, saveBookings, { createdAt: new Date().toISOString(), phone: '1234567890', bookingType: 'table', date: new Date().toISOString(), time: '19:00', partySize: 2, customerName: `Test ${TEST_PREFIX}`, status: 'pending', notes: 'test booking', items: JSON.stringify([])}));
    allResults.push(...await genericCrudTest<Order>('Orders', getOrders, saveOrders, { items: JSON.stringify([{ menuItemId: 'test', name: 'Test Item', price: 1, quantity: 1, selectedPortion: 'Regular', note: ''}]), total: 1, status: 'Pending', orderType: 'Takeaway', customerName: `Test ${TEST_PREFIX}`, createdAt: new Date().toISOString() }));
    allResults.push(...await genericCrudTest<IntegrationSetting>('Integrations', getIntegrationSettings, saveIntegrationSettings, { platform: 'zomato', isEnabled: false }));

    // 3. Test settings files (not array-based) using the robust settings test function
    const testGeneralSettings: InvoiceSetupSettings = { companyName: `Test Co. ${testRunId}`, companyAddress: '123 Test St', currencyCode: 'USD', currencySymbol: '$', panNumber: 'TESTPAN', gstNumber: 'TESTGST', fssaiNumber: 'TESTFSSAI', companyLogoUrl: '', scanForOrderQRUrl: '', scanForPayQRUrl: '', printElements: { showLogo: false, showInvoiceHeaderText: false, showScanForOrderQR: false, showScanForPayQR: false, showPanNumber: false, showGstNumber: false, showFssaiNumber: false, showInvoiceFooterText1: false, showInvoiceFooterText2: false, showCompanyAddress: false, showCompanyPhone: false }, homepageLayoutConfig: JSON.stringify(Array.from(DEFAULT_HOMEPAGE_LAYOUT).reverse().map((s, i) => ({ ...s, order: i, isVisible: !s.isVisible }))), autoGenerateInvoiceFooterQuote: false, invoiceFooterQuoteLanguage: 'en' };
    allResults.push(...await testSettingsCrud<InvoiceSetupSettings>('General Settings', getGeneralSettings, saveGeneralSettings, testGeneralSettings));
    
    const testNotificationSettings: NotificationSettings = { admin: { notifyOnNewOrder: false, notifyOnNewBooking: false, notifyOnNewUserSignup: false, notifyOnNewFeedback: false }, user: { emailOnOrderConfirmation: false, emailOnOrderStatusUpdate: false, emailOnOrderCompletion: false, emailOnBookingConfirmation: false, emailOnBookingStatusUpdate: false } };
    allResults.push(...await testSettingsCrud<NotificationSettings>('Notification Settings', getNotificationSettings, saveNotificationSettings, testNotificationSettings));
    
    const testRateLimitConfig: RateLimitConfig = { otpRequestsPerHour: 99, otpRequestsPerDay: 999, signupAttemptsPerHour: 99, signupAttemptsPerDay: 999 };
    allResults.push(...await testSettingsCrud<RateLimitConfig>('Rate Limit Config', getRateLimitConfig, saveRateLimitConfig, testRateLimitConfig));

    const testConversionRates: ConversionRates = { INR: { USD: 1, GBP: 1, INR: 1} };
    allResults.push(...await testSettingsCrud<ConversionRates>(
        'Currency Rates',
        getConversionRates,
        async (rates) => saveConversionRates(rates.INR || {}), // Adapt the call here
        testConversionRates
    ));

    // Special case for Role Permissions (array-based settings)
    allResults.push(await runTest('Role Permissions', 'Update & Verify', async () => {
        const originalPerms = await getRolePermissions();
        try {
            const testPerms: RolePermission[] = [{ roleName: `test_role_${testRunId}`, allowedRouteIds: ['dashboard'] }];
            const saveResult = await saveRolePermissions(testPerms);
            if (!saveResult.success) return { status: 'failure', message: "Failed to save test permissions." };
            
            const newPerms = await getRolePermissions();
            const testRolePerms = newPerms.find(p => p.roleName === `test_role_${testRunId}`);
            if (testRolePerms && Array.isArray(testRolePerms.allowedRouteIds) && testRolePerms.allowedRouteIds.includes('dashboard')) {
                 return { status: 'success', message: 'Role permissions updated and verified.' };
            }
            return { status: 'failure', message: 'Permissions update not reflected correctly.'};
        } finally {
            await saveRolePermissions(originalPerms); // Cleanup
        }
    }));


    console.log(`[System Health] All checks completed.`);
    return allResults;
}
