
// src/lib/types/inventory.types.ts

export const ALL_STOCK_UNITS = ['kg', 'g', 'liter', 'ml', 'pcs', 'bottle', 'can', 'pack', 'box'] as const;
export type StockUnit = typeof ALL_STOCK_UNITS[number];

export interface StockItem {
    id: string;
    name: string;
    category: string;
    unit: StockUnit; // Base unit for stocking and purchase price
    currentStock: number;
    reorderLevel: number;
    supplier?: string;
    purchasePrice: number; // In BASE_CURRENCY_CODE, per 'unit'
    lastPurchaseDate?: string; // ISO 8601
    expiryDate?: string; // ISO 8601, for expiry alerts
}

export const ALL_EXPENSE_CATEGORIES = ['Ingredients', 'Utilities', 'Rent', 'Salaries', 'Marketing', 'Maintenance', 'Equipment', 'Miscellaneous'] as const;
export type ExpenseCategory = typeof ALL_EXPENSE_CATEGORIES[number];

export const ALL_RECURRENCE_TYPES = ['daily', 'weekly', 'bi-weekly', 'monthly'] as const;
export type RecurrenceType = typeof ALL_RECURRENCE_TYPES[number];

export interface Expense {
    id: string;
    date: string; // ISO 8601
    description: string;
    category: ExpenseCategory;
    amount: number; // In BASE_CURRENCY_CODE
    notes?: string;
    receiptUrl?: string;
    isRecurring: boolean;
    recurrenceType?: RecurrenceType;
    recurrenceEndDate?: string; // ISO 8601
}

export interface StockMenuMapping {
    id: string;
    stockItemId: string;
    menuItemId: string;
    quantityUsedPerServing: number; // How much of the stock item is used
    unitUsed: StockUnit; // The unit for quantityUsedPerServing (e.g., 'g' for grams, even if stock item unit is 'kg')
}

export interface RoomStockItem {
  id: string; // Composite ID like `roomId-menuItemId`
  roomId: string;
  menuItemId: string;
  stockQuantity: number;
}
