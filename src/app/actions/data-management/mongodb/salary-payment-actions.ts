// src/app/actions/data-management/mongodb/salary-payment-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { SalaryPayment } from '@/lib/types';
import Papa from 'papaparse';
import { SALARY_PAYMENTS_HEADERS } from '../_csv-headers';

export async function getSalaryPayments(): Promise<SalaryPayment[]> {
  const { db } = await connectToDatabase();
  const payments = await db.collection('salary-payments').find({}).toArray();
  return payments.map(fromMongo) as SalaryPayment[];
}

// This function appends new payments. It's used by the salary calculation page.
export async function saveSalaryPayments(payments: SalaryPayment[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        if (payments.length === 0) {
            return { success: true, message: "No new salary payments to save.", count: 0 };
        }
        const paymentsWithObjectIds = payments.map(({ id, ...rest }) => ({
            ...rest,
            _id: toObjectId(id),
            paymentDate: new Date(rest.paymentDate),
            periodFrom: new Date(rest.periodFrom),
            periodTo: new Date(rest.periodTo),
        }));
        const result = await db.collection('salary-payments').insertMany(paymentsWithObjectIds as any);
        return { success: true, message: `Successfully saved ${result.insertedCount} new salary payments.`, count: result.insertedCount };
    } catch (error) {
        console.error("Error saving salary payments to MongoDB:", error);
        return { success: false, message: `Error saving salary payments to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadSalaryPaymentsCsv(): Promise<string> {
  const items = await getSalaryPayments();
  if (items.length === 0) return SALARY_PAYMENTS_HEADERS;
  const dataForCsv = items.map(p => ({
    id: p.id,
    paymentDate: new Date(p.paymentDate).toISOString(),
    periodFrom: new Date(p.periodFrom).toISOString(),
    periodTo: new Date(p.periodTo).toISOString(),
    employeeId: p.employeeId,
    employeeName: p.employeeName,
    baseSalaryForPeriod: p.baseSalaryForPeriod.toFixed(2),
    bonusForPeriod: p.bonusForPeriod.toFixed(2),
    deductions: p.deductions.toFixed(2),
    netPay: p.netPay.toFixed(2),
  }));
  return Papa.unparse(dataForCsv, { header: true, columns: SALARY_PAYMENTS_HEADERS.trim().split(',') });
}

// This function REPLACES all payments. It's used by the data management upload feature.
export async function uploadSalaryPaymentsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedData: SalaryPayment[] = parsed.data.map(p => ({
        id: String(p.id || crypto.randomUUID()),
        paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString() : new Date().toISOString(),
        periodFrom: p.periodFrom ? new Date(p.periodFrom).toISOString() : new Date().toISOString(),
        periodTo: p.periodTo ? new Date(p.periodTo).toISOString() : new Date().toISOString(),
        employeeId: String(p.employeeId),
        employeeName: String(p.employeeName),
        baseSalaryForPeriod: Number(p.baseSalaryForPeriod) || 0,
        bonusForPeriod: Number(p.bonusForPeriod) || 0,
        deductions: Number(p.deductions) || 0,
        netPay: Number(p.netPay) || 0,
    }));
    
    // Replace logic
    const { db } = await connectToDatabase();
    try {
        await db.collection('salary-payments').deleteMany({});
        if (validatedData.length > 0) {
            const paymentsWithObjectIds = validatedData.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                paymentDate: new Date(rest.paymentDate),
                periodFrom: new Date(rest.periodFrom),
                periodTo: new Date(rest.periodTo),
            }));
            const result = await db.collection('salary-payments').insertMany(paymentsWithObjectIds as any);
            return { success: true, message: `Successfully replaced and saved ${result.insertedCount} salary payments.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all salary payments.', count: 0 };
    } catch (error) {
        console.error("Error replacing salary payments in MongoDB:", error);
        return { success: false, message: `Error replacing salary payments in MongoDB: ${(error as Error).message}` };
    }
}
