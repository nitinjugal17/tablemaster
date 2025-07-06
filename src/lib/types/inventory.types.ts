// src/lib/types/inventory.types.ts

export type StockUnit = 'kg' | 'g' | 'liter' | 'ml' | 'pcs' | 'bottle' | 'can' | 'pack' | 'box';
export const ALL_STOCK_UNITS: StockUnit[] = ['kg', 'g', 'liter', 'ml', 'pcs', 'bottle', 'can', 'pack', 'box'];

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
}

export type ExpenseCategory = 'Ingredients' | 'Utilities' | 'Rent' | 'Salaries' | 'Marketing' | 'Maintenance' | 'Equipment' | 'Miscellaneous';
export const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = ['Ingredients', 'Utilities', 'Rent', 'Salaries', 'Marketing', 'Maintenance', 'Equipment', 'Miscellaneous'];

export type RecurrenceType = 'daily' | 'weekly' | 'bi-weekly' | 'monthly'; // Added 'bi-weekly'
export const ALL_RECURRENCE_TYPES: RecurrenceType[] = ['daily', 'weekly', 'bi-weekly', 'monthly'];

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
