
// src/app/(app)/dashboard/page.tsx
import { Suspense } from 'react';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { Loader2 } from 'lucide-react';
import { getMenuItems, getOrders, getBookings, getEmployees } from '@/app/actions/data-management-actions';
import type { MenuItem, Order, Booking, Employee } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  try {
    // Fetch only the data essential for the dashboard stats
    const [
      menuItems, orders, bookings, employees
    ] = await Promise.all([
      getMenuItems(),
      getOrders(),
      getBookings(),
      getEmployees()
    ]);

    return { menuItems, orders, bookings, employees };
  } catch (error) {
    console.error("Failed to fetch initial data for dashboard:", error);
    // Provide a safe fallback on error
    return { 
      menuItems: [], 
      orders: [], 
      bookings: [], 
      employees: []
    };
  }
}


export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground mt-4">Loading Dashboard...</p>
        </div>
    }>
      <DashboardClient
        initialMenuItems={data.menuItems}
        initialOrders={data.orders}
        initialBookings={data.bookings}
        initialEmployees={data.employees}
      />
    </Suspense>
  );
}
