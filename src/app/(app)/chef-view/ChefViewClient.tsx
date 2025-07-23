
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, OrderItem, PrinterSetting, PrintableKOTData } from '@/lib/types';
import { getOrders, getPrinterSettings } from '@/app/actions/data-management-actions';
import { updateOrderStatus } from '@/app/actions/order-actions'; 
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardCheck, Utensils, AlertCircle, CheckCircle2, ChevronsUpDown, Timer, RefreshCw, StickyNote, DollarSign, Printer as PrinterIcon, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, subDays, isValid } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PendingItemsSummary } from '@/components/chef/PendingItemsSummary';
import ChefOrderCard from '@/components/chef/ChefOrderCard';
import { useCurrency } from '@/hooks/useCurrency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { sendTestPrintCommand } from '@/app/actions/printer-actions';
import { KOTPreview } from '@/components/chef/KOTPreview';
import { ConsolidatedKOTPreview } from '@/components/chef/ConsolidatedKOTPreview';
import { useNotification } from '@/context/NotificationContext';

interface ChefViewClientProps {
    initialOrders: Order[];
    initialPrinters: PrinterSetting[];
}

// Define a unique key for each item within an order for state tracking
const getItemKey = (orderId: string, itemId: string, itemIndex: number, portion?: string) => `${orderId}-${itemId}-${portion || 'fixed'}-${itemIndex}`;

export function ChefViewClient({ initialOrders, initialPrinters }: ChefViewClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [printers, setPrinters] = useState<PrinterSetting[]>(initialPrinters);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();
  const { settings: generalSettings, isLoadingSettings } = useGeneralSettings();
  const { addNotification } = useNotification();

  const [preparedItemsMap, setPreparedItemsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [updatingOrderStatusMap, setUpdatingOrderStatusMap] = useState<Record<string, boolean>>({});

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(30);

  const [isKotPreviewOpen, setIsKotPreviewOpen] = useState(false);
  const [orderForKot, setOrderForKot] = useState<Order | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [isConsolidatedKotOpen, setIsConsolidatedKotOpen] = useState(false);


  const fetchAndSetOrders = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setIsLoading(true);
    
    const oldOrderIds = new Set(orders.map(o => o.id));

    try {
      const [fetchedOrders, fetchedPrinters] = await Promise.all([getOrders(), getPrinterSettings()]);
      setOrders(fetchedOrders); 
      setPrinters(fetchedPrinters);

      const newOrders = fetchedOrders.filter(o => !oldOrderIds.has(o.id) && o.status === 'Preparing');
      if (isAutoRefresh && newOrders.length > 0) {
        addNotification('new_order', `New order received: #${String(newOrders[0].id).substring(0,8)}`);
      }

      setPreparedItemsMap(prevMap => {
        const newMap: Record<string, Record<string, boolean>> = {};
        const preparingOrders = fetchedOrders.filter(o => o.status === 'Preparing');
        
        preparingOrders.forEach(order => {
          if (!prevMap[order.id]) {
            newMap[order.id] = {};
            const orderItemsArray: OrderItem[] = Array.isArray(order.items)
              ? order.items
              : typeof order.items === 'string'
              ? JSON.parse(order.items)
              : [];

            orderItemsArray.forEach((item, index) => {
              const itemKey = getItemKey(order.id, item.menuItemId, index, item.selectedPortion);
              newMap[order.id][itemKey] = false; 
            });
          } else {
            newMap[order.id] = prevMap[order.id];
          }
        });
        return newMap;
      });

    } catch (error) {
      console.error("Failed to fetch orders for chef view:", error);
      toast({ title: "Error Loading Orders", description: "Could not load orders.", variant: "destructive" });
    } finally {
      if (!isAutoRefresh) setIsLoading(false);
    }
  }, [toast, orders, addNotification]);

  // Use useEffect to update state when initial props change
  useEffect(() => {
    setOrders(initialOrders);
    setPrinters(initialPrinters);
    // You might want to re-initialize the preparedItemsMap here as well
    // if the initialOrders prop can change dynamically (e.g., via page refresh)
  }, [initialOrders, initialPrinters]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled) {
      intervalId = setInterval(() => {
        toast({ title: "Auto-Refreshing Orders...", description: `Fetching latest orders for chef view.`, duration: 2000 });
        fetchAndSetOrders(true);
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

  const handleOpenKotPreview = (order: Order) => {
    setOrderForKot(order);
    setIsKotPreviewOpen(true);
  };
  
  const handlePrintWebPreview = (targetElementId: string) => {
    const printContents = document.getElementById(targetElementId)?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(`<html><head><title>KOT Print</title>
        <style>@media print { body { font-family: sans-serif; } .no-print { display: none !important; } } 
        @page { size: auto;  margin: 5mm; }
        </style>
      </head><body>`);
      printWindow?.document.write(printContents);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      setTimeout(() => { printWindow?.print(); }, 250);
    }
  };
  
  const handlePrintThermal = async (order?: Order, allOrders?: Order[]) => {
    if (isLoadingSettings) return;
    const defaultPrinterId = generalSettings.defaultThermalPrinterId;
    const printerToUse = printers.find(p => p.id === defaultPrinterId);
    if (!printerToUse) {
      toast({ title: "Printer Not Configured", description: "No default thermal printer is set in Invoice Settings.", variant: "destructive" });
      return;
    }

    if (printerToUse.connectionType === 'system') {
      toast({ title: "System Printer Selected", description: "Using OS print dialog for KOT.", duration: 3000 });
      handlePrintWebPreview(order ? 'kot-preview-content' : 'consolidated-kot-preview-content');
      return;
    }
    
    setIsPrinting(true);
    let result;
    if (order) {
        result = await sendTestPrintCommand({ printer: printerToUse, kotData: { order } });
    } else if (allOrders) {
        result = await sendTestPrintCommand({ printer: printerToUse, kotData: { orders: allOrders } });
    }
    
    if (result) {
        toast({ title: result.success ? "Print Command Sent" : "Print Failed", description: result.message, variant: result.success ? "default" : "destructive" });
    }
    setIsPrinting(false);
  };


  const dailyStats = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    
    const todaysCompletedOrders = orders.filter(order => {
        try {
            if (order.status !== 'Completed' || !order.createdAt) return false;
            const orderDate = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : new Date(order.createdAt);
            return isValid(orderDate) && isWithinInterval(orderDate, { start: todayStart, end: todayEnd });
        } catch { return false; }
    });

    const totalRevenue = todaysCompletedOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = todaysCompletedOrders.length;
    
    return { totalOrders, totalRevenue };
  }, [orders]);

  const ordersToDisplay = useMemo(() => {
    const oneMonthAgo = subDays(new Date(), 30);
    return orders.filter(order => {
        if (order.status !== 'Preparing') return false;

        const items = Array.isArray(order.items) ? order.items :
                      typeof order.items === 'string' && order.items.trim().startsWith('[') ? JSON.parse(order.items) :
                      [];
        if (items.length === 0) return false;
        
        try {
            if (!order.createdAt) return false;
            const orderDate = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : new Date(order.createdAt);
            return isValid(orderDate) && orderDate >= oneMonthAgo;
        } catch {
            return false;
        }
    });
  }, [orders]);


  if (isLoading && orders.length === 0) { 
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading orders for preparation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
       <Dialog open={isKotPreviewOpen} onOpenChange={setIsKotPreviewOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>KOT Preview for Order #{orderForKot?.id.substring(0,8)}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                   {orderForKot && <KOTPreview order={orderForKot} />}
                </ScrollArea>
                <DialogFooter className="sm:justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handlePrintWebPreview('kot-preview-content')}><FileText className="mr-2 h-4 w-4"/>Print (Web)</Button>
                        <Button onClick={() => handlePrintThermal(orderForKot!)} disabled={isPrinting}>
                            {isPrinting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <PrinterIcon className="mr-2 h-4 w-4"/>Print (Thermal)
                        </Button>
                    </div>
                    <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
         <Dialog open={isConsolidatedKotOpen} onOpenChange={setIsConsolidatedKotOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Consolidated KOT Preview (All Preparing Orders)</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                   <ConsolidatedKOTPreview orders={ordersToDisplay} />
                </ScrollArea>
                <DialogFooter className="sm:justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handlePrintWebPreview('consolidated-kot-preview-content')}><FileText className="mr-2 h-4 w-4"/>Print (Web)</Button>
                        <Button onClick={() => handlePrintThermal(undefined, ordersToDisplay)} disabled={isPrinting}>
                            {isPrinting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <PrinterIcon className="mr-2 h-4 w-4"/>Print (Thermal)
                        </Button>
                    </div>
                    <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

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
            <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={() => setIsConsolidatedKotOpen(true)} variant="outline" size="sm" disabled={isLoading || ordersToDisplay.length === 0} className="flex-1">
                    <PrinterIcon className="mr-2 h-4 w-4" /> 
                    Print All KOTs
                </Button>
                <Button onClick={() => fetchAndSetOrders(false)} variant="outline" size="sm" disabled={isLoading} className="flex-1">
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin': ''}`} /> 
                    Refresh Now
                </Button>
            </div>
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
                    onPrintKot={handleOpenKotPreview}
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
