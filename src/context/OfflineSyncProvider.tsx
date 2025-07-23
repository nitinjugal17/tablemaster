
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { placeNewWalkInOrder } from '@/app/actions/order-actions';
import type { Order } from '@/lib/types';

interface OfflineSyncContextType {
  isOnline: boolean;
  latency: number | null;
  syncOfflineOrders: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

const OFFLINE_ORDER_QUEUE_KEY = 'offline_order_queue';
const HEALTH_CHECK_INTERVAL = 15000; // Check every 15 seconds

export const OfflineSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [latency, setLatency] = useState<number | null>(null);
  const { toast } = useToast();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkServerHealth = useCallback(async () => {
    // If browser reports offline, don't bother fetching.
    if (!navigator.onLine) {
        if(isOnline) setIsOnline(false);
        setLatency(null); // No latency info when offline
        return;
    }
    
    const startTime = Date.now();
    try {
      // Use a cache-busting parameter to ensure we're not hitting a stale response
      const response = await fetch(`/api/health?t=${new Date().getTime()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      const endTime = Date.now();
      setLatency(endTime - startTime);

      if (response.ok) {
        if (!isOnline) {
          console.log('[HealthCheck] Server is now reachable.');
          setIsOnline(true);
        }
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      if (isOnline) {
        console.warn('[HealthCheck] Server is unreachable.', error);
        setIsOnline(false);
      }
      setLatency(null); // No latency info on error
    }
  }, [isOnline]);

  const syncOfflineOrders = useCallback(async () => {
    if (isSyncing || !isOnline) {
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

  }, [toast, isSyncing, isOnline]);

  useEffect(() => {
    // Browser online/offline events
    const handleBrowserOnline = () => {
      console.log('[Browser Event] Network connection restored.');
      checkServerHealth();
    };

    const handleBrowserOffline = () => {
      console.log('[Browser Event] Network connection lost.');
      setIsOnline(false);
      setLatency(null);
      toast({
        title: "You are now offline",
        description: "Orders placed will be queued and synced when you reconnect.",
        variant: 'destructive',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);
    
    // Server heartbeat
    if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL);

    // Initial check on load
    checkServerHealth();

    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [checkServerHealth]);

  useEffect(() => {
      if(isOnline) {
          syncOfflineOrders();
      }
  }, [isOnline, syncOfflineOrders]);

  const contextValue = useMemo(() => ({ isOnline, latency, syncOfflineOrders }), [isOnline, latency, syncOfflineOrders]);

  return (
    <OfflineSyncContext.Provider value={contextValue}>
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
