
// src/app/(app)/admin/reports/sales/page.tsx
'use server';

import { Suspense } from 'react';
import {
  getOrders,
  getEmployees,
  getBookings,
  getRestaurantTables,
  getOutlets,
  getActiveDataSourceStatus,
} from '@/app/actions/data-management-actions';
import { SalesReportClient } from '@/components/admin/reports/SalesReportClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';

// This Server Component is now only responsible for fetching the initial, unfiltered data.
// All filtering and calculations will happen on the client in SalesReportClient.
export default async function SalesReportPage() {
  const [
    allOrders,
    allEmployees,
    allBookings,
    allTables,
    allOutlets,
    dataSourceStatus,
  ] = await Promise.all([
    getOrders(),
    getEmployees(),
    getBookings(),
    getRestaurantTables(),
    getOutlets(),
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
            <p className="ml-4 text-muted-foreground">Loading Sales Report...</p>
        </div>
      }>
        <SalesReportClient
          initialOrders={allOrders}
          initialEmployees={allEmployees}
          initialBookings={allBookings}
          initialTables={allTables}
          initialOutlets={allOutlets}
        />
      </Suspense>
    </div>
  );
}
