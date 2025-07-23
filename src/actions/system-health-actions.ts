

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
} from '@/app/actions/data-management-actions';
import type { 
    User, MenuItem, Order, Booking, RestaurantTable, Room, DiscountCode, Offer, Banner, StockItem, Expense, Employee, 
    AddonGroup, Addon, AttendanceRecord, SalaryPayment, Feedback, FeedbackCategory, PrinterSetting, InvoiceSetupSettings, NotificationSettings, HomepageSectionConfig, Outlet, RateLimitConfig, RolePermission, OrderItem, StockMenuMapping, RoomStockItem, ManagedImage,
    Menu, IntegrationSetting
} from '@/lib/types';
import { DEFAULT_HOMEPAGE_LAYOUT } from '@/lib/types';

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

// Reusable cleanup function to ensure test data is removed
async function cleanupByPrefix(testFn: (initialItems: any[]) => Promise<{ success: boolean; message: string; count?: number }>, getterFn: () => Promise<any[]>, prefix: string) {
    try {
        const currentItems = await getterFn();
        // A more robust check for various fields that might contain the prefix
        const itemsToKeep = currentItems.filter(item => 
            !(item.name || item.title || item.code || item.email || item.description || item.employeeId || '')
            .toString().toLowerCase().includes(prefix.toLowerCase())
        );
        await testFn(itemsToKeep);
    } catch (e) {
        console.error(`[System Health] Cleanup failed for prefix ${prefix}:`, (e as Error).message);
    }
}


// --- INDIVIDUAL MODULE TEST FUNCTIONS ---

async function testUserCrud(): Promise<TestResult[]> {
    const testUserEmail = `${TEST_PREFIX}${testRunId}@test.com`;
    const testUserId = `user-${TEST_PREFIX}${testRunId}`;
    let createdUser: User | undefined;
    let originalUsers: User[] = [];

    const cleanup = async () => {
         await saveUsers(originalUsers);
    };

    try {
        originalUsers = await getUsers();
        const createResult = await runTest('Users', 'Create', async () => {
            const users = await getUsers();
            const saveResult = await saveUsers([...users, { id: testUserId, email: testUserEmail, name: "Test User", role: 'user', accountStatus: 'active', password: 'test', loyaltyPoints: 0 }]);
            return saveResult.success ? { status: 'success', message: 'User created.' } : { status: 'failure', message: saveResult.message };
        });
        if (createResult.status === 'failure') return [createResult];

        const readResult = await runTest('Users', 'Read', async () => {
            const users = await getUsers();
            createdUser = users.find(u => u.id === testUserId);
            return createdUser ? { status: 'success', message: 'User read.' } : { status: 'failure', message: 'User not found after creation.' };
        });
        if (readResult.status === 'failure') return [createResult, readResult];

        const updateResult = await runTest('Users', 'Update (Name)', async () => {
            const users = await getUsers();
            const userIndex = users.findIndex(u => u.id === testUserId);
            if (userIndex === -1) return { status: 'failure', message: "User not found for update." };
            users[userIndex].name = "Updated Test User";
            const saveResult = await saveUsers(users);
            const updatedUsers = await getUsers();
            return saveResult.success && updatedUsers.find(u => u.id === testUserId)?.name === "Updated Test User" ? { status: 'success', message: 'User name updated.' } : { status: 'failure', message: 'Update not reflected.' };
        });
        
        const loyaltyResult = await runTest('Users', 'Update (Loyalty Points)', async () => {
             const users = await getUsers();
            const userIndex = users.findIndex(u => u.id === testUserId);
            if (userIndex === -1) return { status: 'failure', message: "User not found for loyalty update." };
            users[userIndex].loyaltyPoints = 100;
            const saveResult = await saveUsers(users);
            const updatedUsers = await getUsers();
            return saveResult.success && updatedUsers.find(u => u.id === testUserId)?.loyaltyPoints === 100 ? { status: 'success', message: 'Loyalty points updated.' } : { status: 'failure', message: 'Loyalty points update not reflected.' };
        });

        return [createResult, readResult, updateResult, loyaltyResult];
    } finally {
        await cleanup();
    }
}

async function testMenuItemCrud(): Promise<TestResult[]> {
    const testItemId = `item-${TEST_PREFIX}${testRunId}`;
    let originalItems: MenuItem[] = [];

    const cleanup = async () => {
        await saveMenuItemChanges(originalItems);
    };

    try {
        originalItems = await getMenuItems();
        const createResult = await runTest('Menu Items', 'Create', async () => {
            const newItem: MenuItem = { id: testItemId, name: `Test ${TEST_PREFIX}`, description: "Test description", portionDetails: JSON.stringify([{name: 'fixed', price: 1, isDefault: true}]), category: 'Test', imageUrl: '', isAvailable: true };
            const saveResult = await saveMenuItemChanges([...originalItems, newItem]);
            return saveResult.success ? { status: 'success', message: 'Item created.' } : { status: 'failure', message: saveResult.message };
        });
        if (createResult.status === 'failure') return [createResult];

        const readResult = await runTest('Menu Items', 'Read', async () => {
            const items = await getMenuItems();
            return items.some(i => i.id === testItemId) ? { status: 'success', message: 'Item read.' } : { status: 'failure', message: 'Item not found.' };
        });
        if (readResult.status === 'failure') return [createResult, readResult];

        const updateResult = await runTest('Menu Items', 'Update', async () => {
            const items = await getMenuItems();
            const itemIndex = items.findIndex(i => i.id === testItemId);
            if(itemIndex === -1) return { status: 'failure', message: "Item to update not found."};
            items[itemIndex].name = `Updated ${TEST_PREFIX}`;
            const saveResult = await saveMenuItemChanges(items);
            const finalItems = await getMenuItems();
            return saveResult.success && finalItems.find(i => i.id === testItemId)?.name.startsWith('Updated') ? { status: 'success', message: 'Item updated.' } : { status: 'failure', message: 'Update not reflected.' };
        });

        return [createResult, readResult, updateResult];
    } finally {
        await cleanup();
    }
}

async function genericCrudTest<T extends { id: string, name?: string, title?: string, code?: string, description?: string, employeeId?: string, customerName?: string, phone?: string }>(
    moduleName: string,
    getterFn: () => Promise<T[]>,
    saverFn: (items: T[]) => Promise<{ success: boolean; message: string; count?: number }>,
    testItemBase: Omit<T, 'id'>
): Promise<TestResult[]> {
    const testId = `id-${TEST_PREFIX}${testRunId}`;
    const testItem = { ...testItemBase, id: testId } as T;
    let originalItems: T[] | null = null;
    
    const cleanup = async () => {
        if (originalItems !== null) {
            await saverFn(originalItems);
        } else {
            // Fallback if original state wasn't captured
            const items = await getterFn();
            await saverFn(items.filter(i => i && i.id && !i.id.startsWith(`id-${TEST_PREFIX}`)));
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
            items[itemIndex] = { ...items[itemIndex], name: `Updated ${TEST_PREFIX}`, title: `Updated ${TEST_PREFIX}`, description: `Updated ${TEST_PREFIX}` };
            const saveResult = await saverFn(items);
            const updatedItems = await getterFn();
            return saveResult.success && updatedItems.some(i => i.id === testId && (i.name?.startsWith('Updated') || i.title?.startsWith('Updated') || i.description?.startsWith('Updated'))) ? { status: 'success', message: 'Item updated.' } : { status: 'failure', message: 'Update not reflected.' };
        });

        return [createResult, readResult, updateResult];
    } finally {
        await cleanup();
    }
}

async function testSettingsCrud<T>(
    moduleName: string,
    getterFn: () => Promise<T>,
    saverFn: (settings: T) => Promise<{ success: boolean; message: string; }>,
    updateField: keyof T,
    testValue: T[keyof T]
): Promise<TestResult[]> {
    let originalSettings: T | undefined;

    const cleanup = async () => {
        if (originalSettings) {
            await saverFn(originalSettings);
        }
    };

    try {
        const readResult = await runTest(moduleName, 'Read', async () => {
            originalSettings = await getterFn();
            return originalSettings ? { status: 'success', message: 'Settings read.' } : { status: 'failure', message: 'Could not read settings.' };
        });
        if (readResult.status === 'failure' || !originalSettings) return [readResult];

        const updateResult = await runTest(moduleName, 'Update', async () => {
            const settingsToUpdate = { ...originalSettings!, [updateField]: testValue };
            const saveResult = await saverFn(settingsToUpdate);
            if (!saveResult.success) return { status: 'failure', message: `Save failed: ${saveResult.message}` };
            
            const newSettings = await getterFn();
            const valueMatches = JSON.stringify(newSettings[updateField]) === JSON.stringify(testValue);
            return valueMatches ? { status: 'success', message: 'Settings updated and verified.' } : { status: 'failure', message: 'Update not reflected.', details: `Expected ${JSON.stringify(testValue)}, got ${JSON.stringify(newSettings[updateField])}` };
        });

        return [readResult, updateResult];
    } finally {
        await cleanup();
    }
}

async function testRoomStockCrud(): Promise<TestResult[]> {
    const testRoomId = `room-${TEST_PREFIX}${testRunId}`;
    const testMenuItemId = `menuitem-${TEST_PREFIX}${testRunId}`;

    const cleanup = async () => {
        await saveRoomStock(testRoomId, []);
    };

    try {
        const createResult = await runTest('Room Stock', 'Create', async () => {
            const testStock: RoomStockItem = { id: `${testRoomId}-${testMenuItemId}`, roomId: testRoomId, menuItemId: testMenuItemId, stockQuantity: 10 };
            const saveResult = await saveRoomStock(testRoomId, [testStock]);
            return saveResult.success ? { status: 'success', message: 'Room stock created.' } : { status: 'failure', message: saveResult.message };
        });
        if (createResult.status === 'failure') return [createResult];

        const readResult = await runTest('Room Stock', 'Read', async () => {
            const roomStock = await getRoomStock(testRoomId);
            return roomStock.some(s => s.menuItemId === testMenuItemId && s.stockQuantity === 10) ? { status: 'success', message: 'Room stock read.' } : { status: 'failure', message: 'Room stock not found.' };
        });
        if (readResult.status === 'failure') return [createResult, readResult];

        const updateResult = await runTest('Room Stock', 'Update', async () => {
            const updatedStock: RoomStockItem = { id: `${testRoomId}-${testMenuItemId}`, roomId: testRoomId, menuItemId: testMenuItemId, stockQuantity: 5 };
            const saveResult = await saveRoomStock(testRoomId, [updatedStock]);
            const finalStock = await getRoomStock(testRoomId);
            return saveResult.success && finalStock.find(s => s.menuItemId === testMenuItemId)?.stockQuantity === 5 ? { status: 'success', message: 'Room stock updated.' } : { status: 'failure', message: 'Update not reflected.' };
        });

        return [createResult, readResult, updateResult];
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

    // 2. Run all CRUD tests sequentially
    allResults.push(...await testUserCrud());
    allResults.push(...await testMenuItemCrud());

    allResults.push(...await genericCrudTest<Menu>('Menus', getMenus, saveMenus, { name: `Test Menu ${TEST_PREFIX}`, menuItemIds: '[]', isActive: true, description: 'A test menu' }));
    allResults.push(...await genericCrudTest<Outlet>('Outlets', getOutlets, saveOutlets, { name: `Test Outlet ${TEST_PREFIX}`, type: 'restaurant', description: 'A test outlet' }));
    allResults.push(...await genericCrudTest<RestaurantTable>('Tables', getRestaurantTables, saveRestaurantTables, { name: `Test Table ${TEST_PREFIX}`, capacity: 4, status: 'Available' }));
    allResults.push(...await genericCrudTest<Room>('Rooms', getRooms, saveRooms, { name: `Test Room ${TEST_PREFIX}`, capacity: 2, pricePerNight: 100, amenities: 'test', description: 'test', imageUrls: 'test.png' }));
    allResults.push(...await genericCrudTest<DiscountCode>('Discounts', getDiscounts, saveDiscounts, { code: `TEST${testRunId}`, type: 'percentage', value: 10, isActive: true, validFrom: new Date().toISOString(), validTo: new Date().toISOString(), description: `Test Discount ${TEST_PREFIX}`, usageLimit: 1, timesUsed: 0, minOrderAmount: 0 }));
    
    // Correctly handle JSON string in 'details'
    const offerLinkedIds = '["id-1","id-2"]'; // Example
    const testOffer: Omit<Offer, 'id'> = { title: `Test Offer ${TEST_PREFIX}`, type: 'seasonal_special', details: JSON.stringify({ comboPrice: 100 }), isActive: true, validFrom: new Date().toISOString(), validTo: new Date().toISOString(), linkedMenuItemIds: offerLinkedIds };
    allResults.push(...await genericCrudTest<Offer>('Offers', getOffers, saveOffers, testOffer));
    
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
    allResults.push(...await testRoomStockCrud());
    allResults.push(...await genericCrudTest<Booking>('Bookings', getBookings, saveBookings, { createdAt: new Date().toISOString(), phone: '1234567890', bookingType: 'table', date: new Date().toISOString(), time: '19:00', partySize: 2, customerName: `Test ${TEST_PREFIX}`, status: 'pending', notes: 'test booking', items: JSON.stringify([])}));
    allResults.push(...await genericCrudTest<Order>('Orders', getOrders, saveOrders, { items: JSON.stringify([{ menuItemId: 'test', name: 'Test Item', price: 1, quantity: 1, selectedPortion: 'Regular', note: ''}]), total: 1, status: 'Pending', orderType: 'Takeaway', customerName: `Test ${TEST_PREFIX}`, createdAt: new Date().toISOString() }));
    allResults.push(...await genericCrudTest<IntegrationSetting>('Integrations', getIntegrationSettings, saveIntegrationSettings, { platform: 'zomato', isEnabled: false }));

    // Settings files (not array-based) need a different approach
    allResults.push(...await testSettingsCrud<InvoiceSetupSettings>('General Settings', getGeneralSettings, saveGeneralSettings, 'companyName', `Test Co. ${testRunId}`));
    allResults.push(...await testSettingsCrud<InvoiceSetupSettings>('ID Card Settings', getGeneralSettings, saveGeneralSettings, 'idCardAddressLine', `Test Address ${testRunId}`));
    
    // Homepage Layout Test
    const newLayoutOrder: HomepageSectionConfig[] = Array.from(DEFAULT_HOMEPAGE_LAYOUT).reverse().map((s, i) => ({ ...s, order: i, isVisible: !s.isVisible }));
    allResults.push(...await testSettingsCrud<InvoiceSetupSettings>('Homepage Layout', getGeneralSettings, saveGeneralSettings, 'homepageLayoutConfig', JSON.stringify(newLayoutOrder)));

    allResults.push(...await testSettingsCrud<NotificationSettings>('Notification Settings', getNotificationSettings, saveNotificationSettings, 'admin', { notifyOnNewOrder: false, notifyOnNewBooking: true, notifyOnNewUserSignup: true, notifyOnNewFeedback: false }));
    allResults.push(...await testSettingsCrud<RateLimitConfig>('Rate Limit Config', getRateLimitConfig, saveRateLimitConfig, 'otpRequestsPerHour', 999));
    
    // Role Permissions test is tricky as there's no single field. We test by saving a known state.
    allResults.push(await runTest('Role Permissions', 'Update & Verify', async () => {
        const originalPerms = await getRolePermissions();
        try {
            const testPerms: RolePermission[] = [{ roleName: 'user', allowedRouteIds: ['dashboard'] }];
            const saveResult = await saveRolePermissions(testPerms);
            if (!saveResult.success) return { status: 'failure', message: "Failed to save test permissions." };
            const newPerms = await getRolePermissions();
            const userPerms = newPerms.find(p => p.roleName === 'user');
            if (userPerms && Array.isArray(userPerms.allowedRouteIds) && userPerms.allowedRouteIds.includes('dashboard') && userPerms.allowedRouteIds.length > 0) {
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




