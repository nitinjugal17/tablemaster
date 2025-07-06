// src/app/actions/data-management/expense-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { EXPENSES_HEADERS } from '../_csv-headers';
import type { Expense } from '@/lib/types';
import { ALL_EXPENSE_CATEGORIES, ALL_RECURRENCE_TYPES } from '@/lib/types';

const expensesCsvPath = path.join(dataDir, 'expenses.csv');

export async function getExpenses(): Promise<Expense[]> {
  const rawData = await readCsvFile<any>(expensesCsvPath, EXPENSES_HEADERS);
  return rawData.map(expense => ({
    id: String(expense.id || crypto.randomUUID()),
    date: expense.date ? new Date(expense.date).toISOString() : new Date().toISOString(),
    description: expense.description || 'No description',
    category: ALL_EXPENSE_CATEGORIES.includes(expense.category) ? expense.category : 'Miscellaneous',
    amount: parseFloat(String(expense.amount)) || 0,
    notes: expense.notes || '',
    receiptUrl: expense.receiptUrl || '',
    isRecurring: String(expense.isRecurring).toLowerCase() === 'true',
    recurrenceType: ALL_RECURRENCE_TYPES.includes(expense.recurrenceType) ? expense.recurrenceType : undefined,
    recurrenceEndDate: expense.recurrenceEndDate ? new Date(expense.recurrenceEndDate).toISOString() : undefined,
  }));
}

export async function saveExpenses(expenses: Expense[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = expenses.map(expense => ({
      ...expense,
      date: new Date(expense.date).toISOString().split('T')[0], 
      amount: Number(expense.amount) || 0,
      isRecurring: String(expense.isRecurring).toLowerCase() === 'true',
      recurrenceType: expense.isRecurring ? expense.recurrenceType : '',
      recurrenceEndDate: expense.isRecurring && expense.recurrenceEndDate ? new Date(expense.recurrenceEndDate).toISOString().split('T')[0] : '',
  }));
  const csvHeaders = EXPENSES_HEADERS.trim().split(',');
  return overwriteCsvFile(expensesCsvPath, dataForCsv, csvHeaders);
}

export async function downloadExpensesCsv(): Promise<string> {
  const items = await getExpenses();
  if (items.length === 0) return EXPENSES_HEADERS;
  const dataForCsv = items.map(expense => ({
      ...expense,
      date: new Date(expense.date).toISOString().split('T')[0],
      isRecurring: String(expense.isRecurring),
      recurrenceEndDate: expense.recurrenceEndDate ? new Date(expense.recurrenceEndDate).toISOString().split('T')[0] : '',
  }));
  const csvHeaders = EXPENSES_HEADERS.trim().split(',');
  return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
}

export async function uploadExpensesCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
    return { success: false, message: `CSV parsing errors: ${errorMessages}` };
  }
  const validatedData: Expense[] = parsed.data.map(expense => ({
    id: String(expense.id || crypto.randomUUID()),
    date: expense.date && new Date(expense.date).toString() !== 'Invalid Date' ? new Date(expense.date).toISOString() : new Date().toISOString(),
    description: String(expense.description || 'No description'),
    category: ALL_EXPENSE_CATEGORIES.includes(expense.category) ? expense.category : 'Miscellaneous',
    amount: parseFloat(String(expense.amount)) || 0,
    notes: String(expense.notes || ''),
    receiptUrl: String(expense.receiptUrl || ''),
    isRecurring: String(expense.isRecurring).toLowerCase() === 'true',
    recurrenceType: String(expense.isRecurring).toLowerCase() === 'true' && ALL_RECURRENCE_TYPES.includes(expense.recurrenceType) ? expense.recurrenceType : undefined,
    recurrenceEndDate: String(expense.isRecurring).toLowerCase() === 'true' && expense.recurrenceEndDate && new Date(expense.recurrenceEndDate).toString() !== 'Invalid Date' ? new Date(expense.recurrenceEndDate).toISOString() : undefined,
  }));
  return saveExpenses(validatedData);
}
