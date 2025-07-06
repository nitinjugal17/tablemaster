
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { placeNewWalkInOrder } from '@/app/actions/order-actions';
import type { Order } from '@/lib/types';

interface OfflineSyncContextType {
  isOnline: boolean;
  syncOfflineOrders: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

const OFFLINE_ORDER_QUEUE_KEY = 'offline_order_queue';

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const { toast } = useToast();

  const syncOfflineOrders = useCallback(async () => {
    if (isSyncing) {
        console.log('[OfflineSync] Sync already in progress.');
        return;
    }

    const queuedOrdersString = localStorage.getItem(OFFLINE_ORDER_QUEUE_KEY);
    if (!queuedOrdersString) {
      return; 
    }
    
    const queuedOrders: Order[] = JSON.parse(queuedOrdersString);
    if (queuedOrders.length === 0) {
      return;
    }

    setIsSyncing(true);
    toast({
      title: "Syncing Offline Data",
      description: `Attempting to sync ${queuedOrders.length} queued order(s)...`,
      duration: 3000,
    });
    
    let successfulSyncs = 0;
    const remainingOrders = [...queuedOrders];

    for (let i = remainingOrders.length - 1; i >= 0; i--) {
        const order = remainingOrders[i];
        try {
            const result = await placeNewWalkInOrder(order);
            if (result.success) {
                successfulSyncs++;
                remainingOrders.splice(i, 1);
            } else {
                console.warn(`[OfflineSync] Failed to sync order ${order.id}: ${result.message}`);
            }
        } catch (error) {
            console.error(`[OfflineSync] Error syncing order ${order.id}:`, error);
        }
    }
    
    localStorage.setItem(OFFLINE_ORDER_QUEUE_KEY, JSON.stringify(remainingOrders));
    
    if(successfulSyncs > 0) {
        toast({
            title: "Sync Complete!",
            description: `${successfulSyncs} order(s) successfully synced with the server.`,
            variant: "default"
        });
    }

    if (remainingOrders.length > 0) {
        toast({
            title: "Sync Incomplete",
            description: `${remainingOrders.length} order(s) could not be synced and remain queued. Will retry on next connection.`,
            variant: "destructive"
        });
    }

    setIsSyncing(false);

  }, [toast, isSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Application came online.');
      setIsOnline(true);
      syncOfflineOrders();
    };

    const handleOffline = () => {
      console.log('[OfflineSync] Application went offline.');
      setIsOnline(false);
      toast({
        title: "You are now offline",
        description: "Orders placed will be queued and synced when you reconnect.",
        variant: 'destructive',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on load
    if(isOnline) {
        syncOfflineOrders();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineOrders, isOnline]);

  return (
    <OfflineSyncContext.Provider value={{ isOnline, syncOfflineOrders }}>
      {children}
    </OfflineSyncContext.Provider>
  );
};

export const useOfflineSync = (): OfflineSyncContextType => {
  const context = useContext(OfflineSyncContext);
  if (context === undefined) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
};
