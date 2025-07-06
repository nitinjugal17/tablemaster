"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, OrderItem } from '@/lib/types';
import { getOrders } from '@/app/actions/data-management-actions';
import { updateOrderStatus } from '@/app/actions/order-actions'; 
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardCheck, Utensils, AlertCircle, CheckCircle2, ChevronsUpDown, Timer, RefreshCw, StickyNote, DollarSign } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PendingItemsSummary } from '@/components/chef/PendingItemsSummary';
import ChefOrderCard from '@/components/chef/ChefOrderCard';
import { useCurrency } from '@/hooks/useCurrency';

// Define a unique key for each item within an order for state tracking
const getItemKey = (orderId: string, itemId: string, itemIndex: number, portion?: string) => `${orderId}-${itemId}-${portion || 'fixed'}-${itemIndex}`;

export default function ChefViewPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();

  const [preparedItemsMap, setPreparedItemsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [updatingOrderStatusMap, setUpdatingOrderStatusMap] = useState<Record<string, boolean>>({});

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(30);


  const fetchAndSetOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedOrders = await getOrders();
      setOrders(fetchedOrders); // Store all orders

      const preparingOrders = fetchedOrders.filter(o => o.status === 'Preparing');
      setPreparedItemsMap(prevMap => {
        const newMap: Record<string, Record<string, boolean>> = {};
        preparingOrders.forEach(order => {
          newMap[order.id] = prevMap[order.id] || {}; 
          order.items.forEach((item, index) => {
            const itemKey = getItemKey(order.id, item.menuItemId, index, item.selectedPortion);
            if (newMap[order.id][itemKey] === undefined) { 
               newMap[order.id][itemKey] = false;
            }
          });
        });
        return newMap;
      });

    } catch (error) {
      console.error("Failed to fetch orders for chef view:", error);
      toast({ title: "Error Loading Orders", description: "Could not load orders.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAndSetOrders();
  }, [fetchAndSetOrders]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled) {
      intervalId = setInterval(() => {
        toast({ title: "Auto-Refreshing Orders...", description: `Fetching latest orders for chef view.`, duration: 2000 });
        fetchAndSetOrders();
      }, refreshIntervalSeconds * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, refreshIntervalSeconds, fetchAndSetOrders, toast]);

  const handleItemToggle = (orderId: string, itemKey: string, isPrepared: boolean) => {
    setPreparedItemsMap(prevMap => ({
      ...prevMap,
      [orderId]: {
        ...(prevMap[orderId] || {}),
        [itemKey]: isPrepared,
      },
    }));
  };

  const handleMarkOrderReady = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const newStatus = order.orderType === 'Dine-in' ? 'Ready for Pickup' : 'Ready for Pickup'; 
    
    setUpdatingOrderStatusMap(prev => ({ ...prev, [orderId]: true }));
    toast({ title: "Updating Order Status...", description: `Attempting to mark order #${String(orderId).substring(0,8)} as ${newStatus}.` });
    
    const result = await updateOrderStatus(orderId, newStatus);
    
    if (result.success) {
      toast({ title: "Order Status Updated!", description: result.message });
      await fetchAndSetOrders(); 
    } else {
      toast({ title: "Update Failed", description: result.message, variant: "destructive" });
    }
    setUpdatingOrderStatusMap(prev => ({ ...prev, [orderId]: false }));
  };

  const dailyStats = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    
    const todaysCompletedOrders = orders.filter(order => {
        try {
            return order.status === 'Completed' && isWithinInterval(parseISO(order.createdAt), { start: todayStart, end: todayEnd });
        } catch { return false; }
    });

    const totalRevenue = todaysCompletedOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = todaysCompletedOrders.length;
    
    return { totalOrders, totalRevenue };
  }, [orders]);


  if (isLoading && orders.length === 0) { 
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading orders for preparation...</p>
      </div>
    );
  }

  const ordersToDisplay = orders.filter(order => order.status === 'Preparing');

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
                <ClipboardCheck className="mr-3 h-8 w-8"/> Chef's Preparation View
            </h1>
            <p className="text-muted-foreground">Manage items for orders currently in 'Preparing' status.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
             <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/50 w-full sm:w-auto">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="autoRefreshChef" className="text-sm font-medium whitespace-nowrap">Auto-Refresh:</Label>
                <Switch
                    id="autoRefreshChef"
                    checked={autoRefreshEnabled}
                    onCheckedChange={setAutoRefreshEnabled}
                    aria-label="Toggle auto refresh"
                />
                {autoRefreshEnabled && (
                    <Select
                    value={String(refreshIntervalSeconds)}
                    onValueChange={(value) => setRefreshIntervalSeconds(Number(value))}
                    >
                    <SelectTrigger className="h-8 w-[80px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="15">15s</SelectItem>
                        <SelectItem value="30">30s</SelectItem>
                        <SelectItem value="60">60s</SelectItem>
                        <SelectItem value="120">2m</SelectItem>
                    </SelectContent>
                    </Select>
                )}
            </div>
            <Button onClick={fetchAndSetOrders} variant="outline" size="sm" disabled={isLoading} className="w-full sm:w-auto">
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin': ''}`} /> 
                Refresh Now
            </Button>
        </div>
      </div>
      
      {ordersToDisplay.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
                 <h2 className="text-2xl font-semibold text-primary flex items-center"><Utensils className="mr-2 h-6 w-6"/>Orders to Prepare ({ordersToDisplay.length})</h2>
                {ordersToDisplay.map(order => (
                    <ChefOrderCard
                    key={order.id}
                    order={order}
                    preparedItems={preparedItemsMap[order.id] || {}}
                    onItemToggle={handleItemToggle}
                    onMarkOrderReady={handleMarkOrderReady}
                    isUpdatingStatus={updatingOrderStatusMap[order.id] || false}
                    />
                ))}
            </div>
            <div className="lg:col-span-1 sticky top-20 space-y-6"> 
                 <PendingItemsSummary orders={ordersToDisplay} preparedItemsMap={preparedItemsMap} />
                 <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl text-primary flex items-center">
                            <DollarSign className="mr-2 h-5 w-5"/> Today's Performance
                        </CardTitle>
                        <CardDescription>Summary of completed work today.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Completed Orders:</span>
                            <span className="font-bold text-lg">{dailyStats.totalOrders}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Total Revenue:</span>
                            <span className="font-bold text-lg">{currencySymbol}{convertPrice(dailyStats.totalRevenue).toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      ) : (
        <Card className="shadow-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">No Orders Awaiting Preparation</h2>
            <p className="text-muted-foreground">All caught up! Or no orders are currently in 'Preparing' status.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
