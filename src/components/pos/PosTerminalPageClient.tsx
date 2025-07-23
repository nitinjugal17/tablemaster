
// src/components/pos/PosTerminalPageClient.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from '@/hooks/useCurrency';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, Utensils, LayoutGrid, PlusCircle, Timer, RefreshCw, Loader2, BedDouble, Archive, FileText as FileTextIcon, Printer as PrinterIcon, Mail as MailIcon, BadgePercent, CheckSquare, CalendarIcon
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

// Import components from other pages to reuse them
import { BookingManagementTab } from '@/components/pos/BookingManagementTab';
import { OrderManagementTab } from '@/components/pos/OrderManagementTab';
import { NewEntryTab } from '@/components/pos/NewEntryTab';
import { ResourceDashboardTab } from '@/components/pos/ResourceDashboardTab';
import { ResourceSetupTab } from '@/components/pos/ResourceSetupTab';
import { ItemAvailabilityTab } from '@/components/pos/ItemAvailabilityTab';
import { StockLevelsTab } from '@/components/pos/StockLevelsTab';
import { OrderEditor } from '@/components/admin/OrderEditor';
import InvoicePreview from '@/components/invoice/InvoicePreview';

import type { Order, Booking, MenuItem as MenuItemType, RestaurantTable, Room, StockItem, StockMenuMapping, PrinterSetting, AppLanguage, InvoiceSetupSettings, PrintableInvoiceDataWithAdjustments, DiscountCode, OrderItem } from '@/lib/types';
import { updateOrder } from '@/app/actions/order-actions';
import { sendTestPrintCommand } from '@/app/actions/printer-actions';
import { sendInvoiceEmail } from '@/app/actions/invoice-actions';
import { getGeneralSettings, getDiscounts } from '@/app/actions/data-management-actions';
import { useNotification } from '@/context/NotificationContext';
import { useTranslation } from 'react-i18next';
import { isFuture, parseISO, isPast, isValid } from 'date-fns';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


interface PosTerminalPageClientProps {
    initialOrders: Order[];
    initialBookings: Booking[];
    initialMenuItems: MenuItemType[];
    initialTables: RestaurantTable[];
    initialRooms: Room[];
    initialStockItems: StockItem[];
    initialStockMenuMappings: StockMenuMapping[];
    initialAllPrinters: PrinterSetting[];
    refreshData: (showToast?: boolean) => Promise<void>;
    isLoading: boolean;
}

export const PosTerminalPageClient: React.FC<PosTerminalPageClientProps> = ({
    initialOrders, initialBookings, initialMenuItems,
    initialTables, initialRooms, initialStockItems,
    initialStockMenuMappings, initialAllPrinters,
    refreshData, isLoading
}) => {
  const { toast } = useToast();
  const { addNotification } = useNotification();
  const { t } = useTranslation('invoice');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(60);
  const [highlightCount, setHighlightCount] = useState(3);
  const { currencySymbol, convertPrice } = useCurrency();
  
  const [generalSettings, setGeneralSettings] = useState<InvoiceSetupSettings | null>(null);
  const [isLoadingGeneralSettings, setIsLoadingGeneralSettings] = useState(true);

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [activeDiscounts, setActiveDiscounts] = useState<DiscountCode[]>([]);

  // Sync props to state
  useEffect(() => setOrders(initialOrders), [initialOrders]);
  useEffect(() => setBookings(initialBookings), [initialBookings]);

  // State for editors/viewers
  const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [viewingItemsOrder, setViewingItemsOrder] = useState<Order | undefined>(undefined);
  const [isItemViewerOpen, setIsItemViewerOpen] = useState(false);
  const [viewingInvoiceOrder, setViewingInvoiceOrder] = useState<Order | undefined>(undefined);
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  const [selectedDiscountCodeId, setSelectedDiscountCodeId] = useState<string>('manual');
  const [printTimeDiscountType, setPrintTimeDiscountType] = useState<'percentage' | 'fixed_amount' | 'none'>('none');
  const [printTimeDiscountValue, setPrintTimeDiscountValue] = useState<number>(0);
  const [printTimeServiceCharge, setPrintTimeServiceCharge] = useState<number | undefined>(undefined);
  const [printTimeLanguage, setPrintTimeLanguage] = useState<AppLanguage>('en');

  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemType | null>(null);
  
  const handleDataRefresh = useCallback(async (showToast?: boolean) => {
    await refreshData(showToast);
  }, [refreshData]);

  const fetchLatestGeneralSettings = useCallback(async () => {
    setIsLoadingGeneralSettings(true);
    try {
      const settings = await getGeneralSettings();
      setGeneralSettings(settings);
    } catch (e) {
      toast({ title: "Error fetching settings", description: "Could not load the latest settings.", variant: "destructive" });
    } finally {
      setIsLoadingGeneralSettings(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchLatestGeneralSettings();
  }, [fetchLatestGeneralSettings]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled) {
      intervalId = setInterval(() => {
        handleDataRefresh(true);
      }, refreshIntervalSeconds * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, refreshIntervalSeconds, handleDataRefresh]);
  
  const recentOrderIds = useMemo(() => {
    return orders
        .filter(o => o.status !== 'Completed' && o.status !== 'Cancelled')
        .sort((a, b) => {
            try {
                const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? parseISO(a.createdAt) : new Date(a.createdAt)) : new Date(0);
                const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? parseISO(b.createdAt) : new Date(b.createdAt)) : new Date(0);
                if (!isValid(dateA) || !isValid(dateB)) return 0;
                return dateB.getTime() - dateA.getTime();
            } catch (e) {
                return 0;
            }
        })
        .slice(0, highlightCount)
        .map(o => o.id);
  }, [orders, highlightCount]);

  const handleOpenEditor = (order: Order) => {
    setEditingOrder(order);
    setIsEditorOpen(true);
  }
  
  const handleOpenItemViewer = (order: Order) => {
    setViewingItemsOrder(order);
    setIsItemViewerOpen(true);
  }

  const handleSaveOrder = async (updatedOrderData: Order) => {
    const result = await updateOrder(updatedOrderData);
    if (result.success) {
      toast({ title: "Order Updated", description: `Order #${String(updatedOrderData.id).substring(0,8)} saved successfully.` });
      await refreshData(false); // Refresh data from source
    } else {
      toast({ title: "Error Saving Order", description: result.message, variant: "destructive" });
    }
    setIsEditorOpen(false);
    setEditingOrder(undefined);
  };
  
   const handleMenuItemSelect = (itemId: string | null) => {
    if (itemId === null) {
      setSelectedMenuItem(null);
      return;
    }
    const item = initialMenuItems.find(mi => mi.id === itemId);
    setSelectedMenuItem(item || null);
  };

  const handleOpenInvoiceViewer = async (order: Order) => {
    await fetchLatestGeneralSettings();
    if (!generalSettings) {
        toast({ title: "Loading settings...", description: "Please wait a moment and try again.", variant: "default"});
        return;
    }
     // Fetch latest discounts
    try {
        const fetchedDiscounts = await getDiscounts();
        const now = new Date();
        setActiveDiscounts(fetchedDiscounts.filter(d => 
            d.isActive && 
            (!d.validFrom || !isFuture(parseISO(d.validFrom))) &&
            (!d.validTo || !isPast(parseISO(d.validTo)))
        ));
    } catch (e) {
        toast({ title: "Error fetching discounts", description: "Could not load the latest discount codes for the invoice.", variant: "destructive" });
    }
    setSelectedDiscountCodeId('manual');
    setPrintTimeDiscountType('none');
    setPrintTimeDiscountValue(0);
    setPrintTimeServiceCharge(generalSettings.serviceChargePercentage);
    setPrintTimeLanguage(generalSettings.globalDisplayLanguage || 'en');
    setViewingInvoiceOrder(order);
    setIsInvoiceViewerOpen(true);
  };
  
  const handlePrintWebPreview = (targetElementId: string, printMode: 'thermal' | 'pdf-web') => {
    const printableContent = document.getElementById(targetElementId);
    if (!printableContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    printWindow.document.write('<html><head><title>Print Invoice</title>');
    Array.from(document.styleSheets).forEach(sheet => {
      try {
        if (sheet.href) printWindow.document.write(`<link href="${sheet.href}" rel="stylesheet">`);
      } catch (e) { /* ignore CORS issues */ }
    });
    
    let styles = `@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } #${targetElementId} { box-shadow: none !important; border: none !important; margin: 0 auto !important; padding: 0 !important; } }`;
    if (printMode === 'thermal') {
        styles += `@page { size: 80mm auto; margin: 3mm; }`;
    }
    printWindow.document.write(`<style>${styles}</style></head><body>`);
    printWindow.document.write(printableContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handlePrintThermal = async () => {
    const printableInvoiceData = invoicePreviewData;
    if (!printableInvoiceData || !generalSettings) return;

    const defaultPrinterId = generalSettings.defaultThermalPrinterId;
    const printerToUse = initialAllPrinters.find(p => p.id === defaultPrinterId);
    if (!printerToUse) {
        toast({ title: "Printer Not Configured", description: "No default thermal printer is set in Invoice Settings.", variant: "destructive" });
        return;
    }

    if (printerToUse.connectionType === 'system') {
        toast({ title: "System Printer Selected", description: "Using OS print dialog for thermal receipt.", duration: 3000 });
        handlePrintWebPreview('invoice-preview-content-thermal-for-os-pos', 'thermal'); 
        return;
    }
    
    setIsPrintingThermal(true);
    const result = await sendTestPrintCommand({ printer: printerToUse, invoiceData: printableInvoiceData });
    toast({ title: result.success ? "Print Command Sent" : "Print Failed", description: result.message, variant: result.success ? "default" : "destructive" });
    setIsPrintingThermal(false);
  };

  const handleEmailReceipt = async () => {
    const printableInvoiceData = invoicePreviewData;
    if (!printableInvoiceData) return;
    const customerEmail = printableInvoiceData.order.email || prompt("Enter customer email for receipt:", "");
    if (!customerEmail) return;

    const labels = {
        invoiceTitle: t('invoiceTitle'),
        billOfSupplyTitle: t('billOfSupplyTitle'),
        orderId: t('orderId'),
        date: t('date'),
        customer: t('customer'),
        table: t('table'),
        phone: t('phone'),
        orderType: t('orderType'),
        paymentId: t('paymentId'),
        paymentStatusPending: t('paymentStatusPending'),
        itemsTableHeader: t('itemsTableHeader'),
        qtyTableHeader: t('qtyTableHeader'),
        priceTableHeader: t('priceTableHeader'),
        costTableHeader: t('costTableHeader'),
        totalTableHeader: t('totalTableHeader'),
        itemNotePrefix: t('itemNotePrefix'),
        subtotalLabel: t('subtotalLabel'),
        serviceChargeLabel: t('serviceChargeLabel'),
        discountLabel: t('discountLabel'),
        gstLabel: t('gstLabel'),
        vatLabel: t('vatLabel'),
        cessLabel: t('cessLabel'),
        grandTotalLabel: t('grandTotalLabel'),
        totalCalculatedCostLabel: t('totalCalculatedCostLabel'),
        panLabel: t('panLabel'),
        gstinLabel: t('gstinLabel'),
        fssaiLabel: t('fssaiLabel'),
        scanForMenuOrder: t('scanForMenuOrder'),
        scanToPay: t('scanToPay'),
        thankYouMessage: t('thankYouMessage'),
        nutritionalInfoTitle: t('nutritionalInfoTitle'),
    };

    setIsSendingEmail(true);
    const result = await sendInvoiceEmail({ invoiceData: { ...printableInvoiceData, customerEmail }, labels });
    toast({ title: result.success ? "Receipt Emailed" : "Email Failed", description: result.message, variant: result.success ? "default" : "destructive" });
    setIsSendingEmail(false);
  };

  const handleDiscountCodeSelect = (discountId: string) => {
    setSelectedDiscountCodeId(discountId);
    if (discountId === 'manual') {
        setPrintTimeDiscountType('none');
        setPrintTimeDiscountValue(0);
    } else {
        const selectedCode = activeDiscounts.find(d => d.id === discountId);
        if (selectedCode) {
            if (viewingInvoiceOrder && selectedCode.minOrderAmount && viewingInvoiceOrder.total < selectedCode.minOrderAmount) {
                toast({ title: "Minimum Order Not Met", description: `This discount code requires a minimum order of ${currencySymbol}${selectedCode.minOrderAmount.toFixed(2)}.`, variant: "destructive" });
                setPrintTimeDiscountType('none');
                setPrintTimeDiscountValue(0);
                setSelectedDiscountCodeId('manual');
            } else {
                setPrintTimeDiscountType(selectedCode.type);
                setPrintTimeDiscountValue(selectedCode.value);
            }
        }
    }
  };

  const invoicePreviewData = useMemo((): PrintableInvoiceDataWithAdjustments | null => {
    if (!viewingInvoiceOrder || isLoadingGeneralSettings || !generalSettings) return null;
    let discount = undefined;
    if (printTimeDiscountType !== 'none' && printTimeDiscountValue > 0) {
      discount = { type: printTimeDiscountType, value: printTimeDiscountValue };
    }
    return {
      ...generalSettings,
      order: viewingInvoiceOrder,
      language: printTimeLanguage,
      discount: discount,
      serviceChargePercentage: printTimeServiceCharge,
    };
  }, [viewingInvoiceOrder, printTimeDiscountType, printTimeDiscountValue, printTimeLanguage, printTimeServiceCharge, generalSettings, isLoadingGeneralSettings]);

  const configuredPrinterName = useMemo(() => {
    if (isLoadingGeneralSettings || !generalSettings) return "Loading...";
    const chefPrinterId = generalSettings.defaultChefKotPrinterId;
    const mainPrinterId = generalSettings.defaultThermalPrinterId;
    
    const chefPrinter = initialAllPrinters.find(p => p.id === chefPrinterId);
    if (chefPrinter) return `${chefPrinter.name} (Chef KOT)`;

    const mainPrinter = initialAllPrinters.find(p => p.id === mainPrinterId);
    if (mainPrinter) return `${mainPrinter.name} (Default)`;
    
    return "Not Configured";
  }, [generalSettings, isLoadingGeneralSettings, initialAllPrinters]);

  return (
    <div className="space-y-6">
       <Dialog open={isEditorOpen} onOpenChange={(open: boolean) => { setIsEditorOpen(open); if (!open) setEditingOrder(undefined);}}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
           <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              Edit Order #{editingOrder?.id ? String(editingOrder.id).substring(0,8) : 'N/A'}...
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && editingOrder && <OrderEditor order={editingOrder} menuItems={initialMenuItems} onSave={handleSaveOrder} currencySymbol={currencySymbol} convertPrice={convertPrice} />}
        </DialogContent>
      </Dialog>
      
       <Dialog open={isItemViewerOpen} onOpenChange={(open) => { if(!open) setViewingItemsOrder(undefined); setIsItemViewerOpen(open); }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Items for Order #{viewingItemsOrder?.id.substring(0,8)}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
                <div className="space-y-2 pr-3">
                    {(viewingItemsOrder?.items && typeof viewingItemsOrder.items === 'string' ? JSON.parse(viewingItemsOrder.items) : viewingItemsOrder?.items || []).map((item: OrderItem, index: number) => (
                        <div key={index} className="p-2 border rounded-md">
                            <p className="font-semibold">{item.name} (x{item.quantity})</p>
                            <p className="text-sm text-muted-foreground">{currencySymbol}{convertPrice(item.price).toFixed(2)}</p>
                            {item.note && <p className="text-xs italic text-accent">Note: {item.note}</p>}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isInvoiceViewerOpen} onOpenChange={(open) => { if(!open) setViewingInvoiceOrder(undefined); setIsInvoiceViewerOpen(open); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] grid grid-rows-[auto_auto_1fr_auto] p-0">
          <DialogHeader className="p-6 pb-2 border-b"><DialogTitle className="font-headline text-2xl text-primary">Invoice for Order #{viewingInvoiceOrder?.id ? String(viewingInvoiceOrder.id).substring(0,8) : 'N/A'}...</DialogTitle></DialogHeader>
          <div className="px-6 py-3 border-b bg-muted/50 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Print-Time Adjustments</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="print-discount-code-pos" className="text-xs">Discount Code</Label>
                    <Select value={selectedDiscountCodeId} onValueChange={handleDiscountCodeSelect}>
                        <SelectTrigger id="print-discount-code-pos" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual" className="text-xs font-semibold">Manual / No Code</SelectItem>
                            <DropdownMenuSeparator />
                            {activeDiscounts.filter(d => !d.outletId || d.outletId === viewingInvoiceOrder?.outletId).map(code => (
                                <SelectItem key={code.id} value={code.id} className="text-xs">
                                    {code.code} ({code.type === 'percentage' ? `${code.value}%` : `${currencySymbol}${code.value}`})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                   {selectedDiscountCodeId === 'manual' && (
                    <>
                        <div className="space-y-1">
                          <Label htmlFor="print-discount-type-pos" className="text-xs">Manual Discount</Label>
                          <Select value={printTimeDiscountType} onValueChange={(v) => setPrintTimeDiscountType(v as any)}>
                            <SelectTrigger id="print-discount-type-pos" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-xs">None</SelectItem>
                              <SelectItem value="percentage" className="text-xs">Percentage (%)</SelectItem>
                              <SelectItem value="fixed_amount" className="text-xs">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {printTimeDiscountType !== 'none' && (
                          <div className="space-y-1">
                              <Label htmlFor="print-discount-value-pos" className="text-xs">Value</Label>
                              <Input id="print-discount-value-pos" type="number" value={printTimeDiscountValue} onChange={e => setPrintTimeDiscountValue(Number(e.target.value))} className="h-8 text-xs"/>
                          </div>
                        )}
                    </>
                  )}
                <div className="space-y-1">
                  <Label htmlFor="print-language-pos" className="text-xs">Invoice Language</Label>
                  <Select value={printTimeLanguage} onValueChange={(v) => setPrintTimeLanguage(v as any)}>
                    <SelectTrigger id="print-language-pos" className="h-8 text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en" className="text-xs">English</SelectItem>
                      <SelectItem value="hi" className="text-xs">Hindi</SelectItem>
                      <SelectItem value="bn" className="text-xs">Bengali</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="print-service-charge-pos" className="text-xs">Service Charge (%)</Label>
                    <Input id="print-service-charge-pos" type="number" step="0.5" value={printTimeServiceCharge ?? ''} onChange={e => setPrintTimeServiceCharge(e.target.value === '' ? undefined : Number(e.target.value))} className="h-8 text-xs"/>
                </div>
              </div>
          </div>
          <ScrollArea className="overflow-y-auto px-6 py-4">
            {invoicePreviewData ? (<>
                <InvoicePreview data={invoicePreviewData} previewType="pdf" id="pos-invoice-preview-content-pdf" />
                <div className="hidden"><InvoicePreview data={invoicePreviewData} previewType="thermal" id="invoice-preview-content-thermal-for-os-pos" /></div>
            </>) : (<div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Loading invoice data...</div>)}
          </ScrollArea>
          <DialogFooter className="p-6 border-t flex-col sm:flex-row gap-2 justify-end">
            {invoicePreviewData && (<>
              <Button variant="outline" onClick={handleEmailReceipt} disabled={isSendingEmail}>{isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MailIcon className="mr-2 h-4 w-4"/>} Email Receipt</Button>
              <Button variant="outline" onClick={() => handlePrintWebPreview('pos-invoice-preview-content-pdf', 'pdf-web')}><FileTextIcon className="mr-2 h-4 w-4"/> Print Web/PDF</Button>
              <Button onClick={handlePrintThermal} disabled={isPrintingThermal}><PrinterIcon className="mr-2 h-4 w-4"/> Print Thermal</Button>
            </>)}
            <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <ClipboardList className="mr-3 h-8 w-8"/> Front Desk Terminal
          </h1>
          <p className="text-muted-foreground">A unified dashboard for managing orders, bookings, and resources.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
             <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/50 w-full sm:w-auto">
                <Label htmlFor="highlight-count" className="text-sm font-medium">Highlight Recent</Label>
                <Select value={String(highlightCount)} onValueChange={(value) => setHighlightCount(Number(value))}>
                    <SelectTrigger id="highlight-count" className="h-8 w-[70px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/50 w-full sm:w-auto">
                <Timer className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="autoRefresh" className="text-sm font-medium whitespace-nowrap">Auto-Refresh:</Label>
                <Switch id="autoRefresh" checked={autoRefreshEnabled} onCheckedChange={setAutoRefreshEnabled} aria-label="Toggle auto refresh"/>
                {autoRefreshEnabled && (
                    <Select value={String(refreshIntervalSeconds)} onValueChange={(value) => setRefreshIntervalSeconds(Number(value))}>
                        <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">30s</SelectItem><SelectItem value="60">60s</SelectItem><SelectItem value="120">2m</SelectItem><SelectItem value="300">5m</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </div>
            <Button onClick={() => handleDataRefresh(true)} variant="outline" size="sm" disabled={isLoading} className="w-full sm:w-auto">
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin': ''}`} /> Refresh Now
            </Button>
        </div>
      </div>
      
      <Alert variant="default" className="bg-sky-50 border-sky-300">
          <PrinterIcon className="h-5 w-5 text-sky-600" />
          <AlertTitle className="font-semibold text-sky-700">KOT Printer Status</AlertTitle>
          <AlertDescription className="text-sky-600">
              KOTs will be automatically printed to: <strong>{configuredPrinterName}</strong>. This can be changed in Admin &gt; Settings &gt; Invoice & Receipt.
          </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="dashboard" className="w-full flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-48 lg:w-56 shrink-0">
            <TabsList className="flex flex-row md:flex-col items-stretch h-auto w-full overflow-x-auto md:overflow-x-visible">
              <TabsTrigger value="dashboard" className="flex-1 md:flex-none justify-start gap-2"><LayoutGrid/>Dashboard</TabsTrigger>
              <TabsTrigger value="orders" className="flex-1 md:flex-none justify-start gap-2"><ClipboardList/>Orders</TabsTrigger>
              <TabsTrigger value="bookings" className="flex-1 md:flex-none justify-start gap-2"><CalendarIcon className="mr-2 h-4 w-4"/>Bookings</TabsTrigger>
              <TabsTrigger value="new_entry" className="flex-1 md:flex-none justify-start gap-2"><PlusCircle/>New Entry</TabsTrigger>
              <TabsTrigger value="resource_setup" className="flex-1 md:flex-none justify-start gap-2"><BedDouble/>Resource Setup</TabsTrigger>
              <TabsTrigger value="item_availability" className="flex-1 md:flex-none justify-start gap-2"><CheckSquare/>Item Availability</TabsTrigger>
              <TabsTrigger value="stock_levels" className="flex-1 md:flex-none justify-start gap-2"><Archive/>Stock Levels</TabsTrigger>
            </TabsList>
        </aside>

        <main className="flex-1 min-w-0">
            <TabsContent value="dashboard">
            <ResourceDashboardTab 
                tables={initialTables} 
                rooms={initialRooms} 
                orders={orders}
                bookings={initialBookings}
                recentOrderIds={recentOrderIds}
            />
            </TabsContent>
            <TabsContent value="orders">
            <OrderManagementTab 
                initialOrders={orders} 
                onEditOrder={handleOpenEditor} 
                onViewInvoice={handleOpenInvoiceViewer} 
                onViewItems={handleOpenItemViewer}
                refreshData={() => handleDataRefresh(false)}
                highlightCount={highlightCount}
            />
            </TabsContent>
            <TabsContent value="bookings">
            <BookingManagementTab 
                initialBookings={bookings} 
                initialTables={initialTables}
                initialRooms={initialRooms}
                refreshData={() => handleDataRefresh(false)}
            />
            </TabsContent>
            <TabsContent value="new_entry">
            <NewEntryTab menuItems={initialMenuItems} tables={initialTables} rooms={initialRooms} bookings={initialBookings} refreshData={() => handleDataRefresh(false)} selectedMenuItem={selectedMenuItem} onMenuItemSelect={handleMenuItemSelect}/>
            </TabsContent>
            <TabsContent value="resource_setup">
                <ResourceSetupTab tables={initialTables} rooms={initialRooms} refreshData={() => handleDataRefresh(false)} />
            </TabsContent>
            <TabsContent value="item_availability">
                <ItemAvailabilityTab menuItems={initialMenuItems} refreshData={() => handleDataRefresh(false)} />
            </TabsContent>
            <TabsContent value="stock_levels">
                <StockLevelsTab stockItems={initialStockItems} menuItems={initialMenuItems} stockMenuMappings={initialStockMenuMappings} />
            </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}

