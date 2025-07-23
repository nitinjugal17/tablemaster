
"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import { MenuItemsClient } from '@/components/admin/menu/MenuItemsClient';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getMenuItems, getStockItems, getStockMenuMappings, getAddonGroups } from '@/app/actions/data-management-actions';

export default function MenuItemsManagementPage() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchData = useCallback(async (showToast = true) => {
        setIsLoading(true);
        if(showToast) toast({ title: "Refreshing Menu Data...", duration: 2000 });
        try {
            const [menuItems, stockItems, stockMenuMappings, addonGroups] = await Promise.all([
                getMenuItems(),
                getStockItems(),
                getStockMenuMappings(),
                getAddonGroups(),
            ]);
            setData({ menuItems, stockItems, stockMenuMappings, addonGroups });
        } catch (error) {
            console.error("Failed to fetch menu items data:", error);
            toast({ title: "Error Fetching Data", description: "Could not load latest menu data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData(false); // Initial fetch
    }, []); // No dependencies to run only once

    if (isLoading && !data) {
        return (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Loading menu items...</p>
            </div>
        );
    }

    if (!data) {
        return <div>Error loading data. Please refresh.</div>
    }

    return (
        <Suspense fallback={
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Loading menu items...</p>
            </div>
        }>
            <MenuItemsClient
                initialMenuItems={data.menuItems}
                initialStockItems={data.stockItems}
                initialStockMenuMappings={data.stockMenuMappings}
                initialAddonGroups={data.addonGroups}
                refreshData={fetchData}
                isLoading={isLoading}
            />
        </Suspense>
    );
}
