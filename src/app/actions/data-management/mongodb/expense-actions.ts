// src/app/actions/data-management/mongodb/expense-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { Expense } from '@/lib/types';
import Papa from 'papaparse';
import { EXPENSES_HEADERS } from '../_csv-headers';
import { ALL_EXPENSE_CATEGORIES, ALL_RECURRENCE_TYPES } from '@/lib/types';

export async function getExpenses(): Promise<Expense[]> {
  const { db } = await connectToDatabase();
  const expenses = await db.collection('expenses').find({}).toArray();
  return expenses.map(fromMongo) as Expense[];
}

export async function saveExpenses(expenses: Expense[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('expenses').deleteMany({});
        if (expenses.length > 0) {
            const expensesWithObjectIds = expenses.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                date: new Date(rest.date),
                recurrenceEndDate: rest.recurrenceEndDate ? new Date(rest.recurrenceEndDate) : undefined,
            }));
            const result = await db.collection('expenses').insertMany(expensesWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} expenses.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all expenses.', count: 0 };
    } catch (error) {
        console.error("Error saving expenses to MongoDB:", error);
        return { success: false, message: `Error saving expenses to MongoDB: ${(error as Error).message}` };
    }
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
    return Papa.unparse(dataForCsv, { header: true, columns: EXPENSES_HEADERS.trim().split(',') });
}

export async function uploadExpensesCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
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
