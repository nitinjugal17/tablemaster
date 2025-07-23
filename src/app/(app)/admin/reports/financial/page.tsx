// src/app/(app)/admin/reports/financial/page.tsx
'use server';
import { Suspense } from 'react';
import {
  getOrders,
  getExpenses,
  getSalaryPayments,
  getStockItems,
  getMenuItems,
  getActiveDataSourceStatus,
} from '@/app/actions/data-management-actions';
import { FinancialReportClient } from '@/components/admin/reports/FinancialReportClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';

// This Server Component fetches all necessary raw data for the financial report.
// The client component will handle filtering, calculations, and display.
export default async function FinancialReportPage() {
  const [
    allOrders,
    allExpenses,
    allSalaryPayments,
    allStockItems,
    allMenuItems,
    dataSourceStatus,
  ] = await Promise.all([
    getOrders(),
    getExpenses(),
    getSalaryPayments(),
    getStockItems(),
    getMenuItems(),
    getActiveDataSourceStatus(),
  ]);

  return (
    <div className="space-y-4">
      {dataSourceStatus.isFallback && (
        <Alert variant="default" className="bg-amber-50 border-amber-400">
          <Info className="h-5 w-5 text-amber-600" />
          <AlertTitle className="font-semibold text-amber-700">Database Unreachable</AlertTitle>
          <AlertDescription className="text-amber-600">
            {dataSourceStatus.message} Displaying data from local CSV files as a fallback.
          </AlertDescription>
        </Alert>
      )}
      <Suspense fallback={
        <div className="flex items-center justify-center h-full py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading Financial Report...</p>
        </div>
      }>
        <FinancialReportClient
          initialOrders={allOrders}
          initialExpenses={allExpenses}
          initialSalaryPayments={allSalaryPayments}
          initialStockItems={allStockItems}
          initialMenuItems={allMenuItems}
        />
      </Suspense>
    </div>
  );
}
