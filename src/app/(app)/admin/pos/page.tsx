"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { PosTerminalPageClient } from '@/components/pos/PosTerminalPageClient';
import {
  getOrders, getBookings, getMenuItems, getRestaurantTables, getRooms, getStockItems, getStockMenuMappings, getPrinterSettings
} from '@/app/actions/data-management-actions';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNotification } from '@/context/NotificationContext';
import type { Order, Booking } from '@/lib/types';

export default function PosTerminalPage() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { addNotification } = useNotification();

    const fetchData = useCallback(async (showToast = true, previousData?: any) => {
        if (showToast) {
            setIsLoading(true); // Show loader only on manual/timed refresh, not initial
            toast({ title: "Refreshing Terminal Data...", duration: 2000 });
        }
        try {
            const [
                orders, bookings, menuItems,
                tables, rooms, stockItems, mappings,
                printers
            ] = await Promise.all([
                getOrders(), getBookings(), getMenuItems(),
                getRestaurantTables(), getRooms(), getStockItems(), getStockMenuMappings(),
                getPrinterSettings()
            ]);
            const newData = { orders, bookings, menuItems, tables, rooms, stockItems, mappings, printers };
            setData(newData);

            // Notification Logic
            if (previousData) {
                const oldOrderIds = new Set(previousData.orders.map((o: Order) => o.id));
                const newOrders = newData.orders.filter((o: Order) => !oldOrderIds.has(o.id));
                if (newOrders.length > 0) {
                    addNotification('new_order', `New order received: #${String(newOrders[0].id).substring(0,8)}`);
                }

                const oldBookingIds = new Set(previousData.bookings.map((b: Booking) => b.id));
                const newBookings = newData.bookings.filter((b: Booking) => !oldBookingIds.has(b.id));
                if (newBookings.length > 0) {
                    addNotification('new_booking', `New booking received from ${newBookings[0].customerName}`);
                }
            }

        } catch (error) {
            console.error("[POS Page] Failed to fetch data:", error);
            toast({ title: "Error Fetching Data", description: "Could not load latest terminal data.", variant: "destructive" });
            if (!data) {
                setData({ orders: [], bookings: [], menuItems: [], tables: [], rooms: [], stockItems: [], mappings: [], printers: [] });
            }
        } finally {
            setIsLoading(false);
        }
    }, [toast, data, addNotification]); // addNotification as dependency

    // Initial data fetch
    useEffect(() => {
        if (!data) { // Only fetch if data is not already loaded
          fetchData(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The data refresh function passed down to the client component
    const handleRefresh = useCallback(async (showToast = true) => {
        await fetchData(showToast, data);
    }, [fetchData, data]);


    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center h-full py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Terminal...</p>
            </div>
        );
    }
    
    if (!data) {
         return (
            <div className="flex items-center justify-center h-full py-16">
                <p className="text-destructive">Failed to load initial data. Please try refreshing the page.</p>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading POS Terminal...</p>
            </div>
        }>
            <PosTerminalPageClient
                initialOrders={data.orders}
                initialBookings={data.bookings}
                initialMenuItems={data.menuItems}
                initialTables={data.tables}
                initialRooms={data.rooms}
                initialStockItems={data.stockItems}
                initialStockMenuMappings={data.mappings}
                initialAllPrinters={data.printers}
                refreshData={handleRefresh}
                isLoading={isLoading}
            />
        </Suspense>
    );
}