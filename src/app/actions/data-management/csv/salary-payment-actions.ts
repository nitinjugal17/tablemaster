// src/app/actions/data-management/csv/salary-payment-actions.ts
'use server';
import path from 'path';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { SALARY_PAYMENTS_HEADERS } from '../_csv-headers';
import type { SalaryPayment } from '@/lib/types';

const salaryPaymentsCsvPath = path.join(dataDir, 'salary-payments.csv');

export async function getSalaryPayments(): Promise<SalaryPayment[]> {
  const rawData = await readCsvFile<any>(salaryPaymentsCsvPath, SALARY_PAYMENTS_HEADERS);
  return rawData.map(payment => ({
    id: String(payment.id || crypto.randomUUID()),
    paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString() : new Date().toISOString(),
    periodFrom: payment.periodFrom ? new Date(payment.periodFrom).toISOString() : new Date().toISOString(),
    periodTo: payment.periodTo ? new Date(payment.periodTo).toISOString() : new Date().toISOString(),
    employeeId: String(payment.employeeId),
    employeeName: String(payment.employeeName),
    baseSalaryForPeriod: Number(payment.baseSalaryForPeriod) || 0,
    bonusForPeriod: Number(payment.bonusForPeriod) || 0,
    deductions: Number(payment.deductions) || 0,
    netPay: Number(payment.netPay) || 0,
  }));
}

export async function saveSalaryPayments(payments: SalaryPayment[]): Promise<{ success: boolean; message: string; count?: number }> {
  const allPayments = await getSalaryPayments();
  const updatedPayments = [...allPayments, ...payments];
  
  const dataForCsv = updatedPayments.map(p => ({
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

  const csvHeaders = SALARY_PAYMENTS_HEADERS.trim().split(',');
  return overwriteCsvFile(salaryPaymentsCsvPath, dataForCsv, csvHeaders);
}
