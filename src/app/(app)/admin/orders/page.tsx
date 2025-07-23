
"use client";
import OrderCard from '@/components/orders/OrderCard';
import { OrderEditor } from '@/components/admin/OrderEditor';
import type { Order, PaymentType, MenuItem as MenuItemType, PrinterSetting, InvoiceSetupSettings, PrintableInvoiceData, AppLanguage, OrderStatus, OrderType, OrderItem, DiscountCode, DiscountCodeType } from '@/lib/types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as AlertDialogFooterComponent,
  AlertDialogHeader as AlertDialogHeaderComponent,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader as TableHeaderComponent, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from "@/components/ui/calendar";
import {
  ClipboardList, SlidersHorizontal, Loader2, PackageSearch, CreditCard, Users, ShoppingBag,
  CalendarDays, BarChart3, Edit3, MoreVertical, Clock, Utensils, CheckCircle,
  LayoutGrid, List, XCircle, Truck, AlertCircle, Printer as PrinterIcon, FileText as FileTextIcon, Mail as MailIcon, BadgePercent, ShieldQuestion, KeyRound
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, parseISO, isToday, isWithinInterval, startOfDay, endOfDay, isValid, isPast, isFuture } from 'date-fns';
import { getOrders, getMenuItems, getPrinterSettings, saveOrders, getDiscounts, getGeneralSettings } from '@/app/actions/data-management-actions';
import { updateOrder, updateOrderStatus, updateOrderPaymentDetails } from '@/app/actions/order-actions';
import { sendTestPrintCommand } from '@/app/actions/printer-actions';
import { sendInvoiceEmail } from '@/app/actions/invoice-actions';
import InvoicePreview from '@/components/invoice/InvoicePreview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrency } from '@/hooks/useCurrency';
import { ALL_ORDER_STATUSES, ALL_ORDER_TYPES, ALL_PAYMENT_TYPES } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


type OrderStats = {
  total: number;
  pending: number;
  preparing: number;
  readyForPickup: number;
  outForDelivery: number;
  completed: number;
  cancelled: number;
  dineIn: number;
  takeaway: number;
  revenueToday: number;
}

const StatCardSkeleton = () => (
    <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-5 rounded-sm" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-24" />
        </CardContent>
    </Card>
);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [allPrinters, setAllPrinters] = useState<PrinterSetting[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generalSettings, setGeneralSettings] = useState<InvoiceSetupSettings | null>(null);
  const [isLoadingGeneralSettings, setIsLoadingGeneralSettings] = useState(true);

  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();
  const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [viewingInvoiceOrder, setViewingInvoiceOrder] = useState<Order | undefined>(undefined);
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { t } = useTranslation('invoice');
  const { user } = useAuth();

  const [printTimeDiscountType, setPrintTimeDiscountType] = useState<'percentage' | 'fixed_amount' | 'none'>('none');
  const [printTimeDiscountValue, setPrintTimeDiscountValue] = useState<number>(0);
  const [selectedDiscountCodeId, setSelectedDiscountCodeId] = useState<string>('manual');
  const [printTimeServiceCharge, setPrintTimeServiceCharge] = useState<number | undefined>(undefined);
  const [printTimeLanguage, setPrintTimeLanguage] = useState<AppLanguage>('en');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState({
    status: 'all',
    orderType: 'all',
    paymentType: 'all',
  });
  const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({ from: undefined, to: undefined });
  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinAction, setPinAction] = useState<{ action: (pinToUse: string) => Promise<any>; title: string, orderId: string } | null>(null);
  const [isUpdatingWithPin, setIsUpdatingWithPin] = useState(false);

  
  const fetchAdminPageData = useCallback(async () => {
    // We fetch general settings separately now
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedMenuItems, fetchedAllPrinters, fetchedDiscounts] = await Promise.all([
        getOrders(),
        getMenuItems(),
        getPrinterSettings(),
        getDiscounts()
      ]);

      setOrders(fetchedOrders);
      setMenuItems(fetchedMenuItems);
      setAllPrinters(fetchedAllPrinters);
      const now = new Date();
      setActiveDiscounts(fetchedDiscounts.filter(d => 
        d.isActive && 
        (!d.validFrom || !isFuture(parseISO(d.validFrom))) &&
        (!d.validTo || !isPast(parseISO(d.validTo)))
      ));

    } catch (error) {
      console.error("Failed to fetch admin orders page data:", error);
      toast({
        title: "Error Loading Data",
        description: "Could not load required data from server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const fetchLatestGeneralSettings = useCallback(async () => {
    setIsLoadingGeneralSettings(true);
    try {
        const settings = await getGeneralSettings();
        setGeneralSettings(settings);
    } catch(e) {
        toast({ title: "Error fetching settings", description: "Could not load the latest invoice settings.", variant: "destructive" });
    } finally {
        setIsLoadingGeneralSettings(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdminPageData();
    fetchLatestGeneralSettings();
  }, [fetchAdminPageData, fetchLatestGeneralSettings]);

  const handleSaveOrder = async (updatedOrderData: Order, pinToUse?: string) => {
    const result = await updateOrder(updatedOrderData, pinToUse);
    if (result.success) {
      toast({ title: "Order Updated", description: `Order #${String(updatedOrderData.id).substring(0,8)} saved successfully.` });
      await fetchAdminPageData();
      setIsEditorOpen(false);
      setEditingOrder(undefined);
    } else {
      toast({ title: "Error Saving Order", description: result.message, variant: "destructive" });
    }
    return result.success;
  };

  const handleOpenEditor = (order: Order) => {
    if(!generalSettings) {
        toast({ title: "Settings not loaded", description: "Please wait a moment for settings to load before editing.", variant: "destructive" });
        return;
    }

    const isLocked = order.status === 'Completed' || order.status === 'Cancelled';
    
    if (isLocked) {
      setPinAction({
        title: `Edit Locked Order #${String(order.id).substring(0,8)}`,
        action: async (pinValue: string) => {
            const result = await updateOrder(order, pinValue);
            if(result.success) {
                setEditingOrder(order);
                setIsEditorOpen(true);
            }
            return result;
        },
        orderId: order.id
      });
      setIsPinDialogOpen(true);
      return;
    }
    setEditingOrder(order);
    setIsEditorOpen(true);
  }

  const handleOpenInvoiceViewer = async (order: Order) => {
    await fetchLatestGeneralSettings(); // Always fetch latest settings
    
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

    if (isLoadingGeneralSettings) {
      toast({ title: "Loading...", description: "Settings are being refreshed. Please wait a moment."});
    }
    
    let orderItemsArray: OrderItem[] = [];
    if (Array.isArray(order.items)) {
        orderItemsArray = order.items;
    } else if (typeof order.items === 'string') {
        try {
            orderItemsArray = JSON.parse(order.items);
        } catch {
            toast({ title: "Error", description: "Could not parse order items for invoice.", variant: "destructive"});
            return;
        }
    }

    const enrichedOrderItems = orderItemsArray.map((item: OrderItem) => {
      const menuItemDetail = menuItems.find(mi => mi.id === item.menuItemId);
      return {
        ...item,
        currentCalculatedCost: menuItemDetail?.calculatedCost,
        calories: menuItemDetail?.calories,
        carbs: menuItemDetail?.carbs,
        protein: menuItemDetail?.protein,
        fat: menuItemDetail?.fat,
        energyKJ: menuItemDetail?.energyKJ,
        servingSizeSuggestion: menuItemDetail?.servingSizeSuggestion,
      };
    });
    const orderForPreview = { ...order, items: enrichedOrderItems };
    setSelectedDiscountCodeId('manual');
    setPrintTimeDiscountType('none');
    setPrintTimeDiscountValue(0);
    setPrintTimeServiceCharge(generalSettings?.serviceChargePercentage);
    setPrintTimeLanguage(generalSettings?.globalDisplayLanguage || 'en');
    setViewingInvoiceOrder(orderForPreview);
    setIsInvoiceViewerOpen(true);
  };
  
  const getInvoiceDataForAction = useCallback(() => {
    if (!viewingInvoiceOrder || !generalSettings) return null;
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
  }, [viewingInvoiceOrder, generalSettings, printTimeLanguage, printTimeDiscountType, printTimeDiscountValue, printTimeServiceCharge]);

  const handleDiscountCodeSelect = (discountId: string) => {
    setSelectedDiscountCodeId(discountId);
    if (discountId === 'manual') {
        setPrintTimeDiscountType('none');
        setPrintTimeDiscountValue(0);
    } else {
        const selectedCode = activeDiscounts.find(d => d.id === discountId);
        if (selectedCode) {
            if (viewingInvoiceOrder && selectedCode.minOrderAmount && viewingInvoiceOrder.total < selectedCode.minOrderAmount) {
                toast({
                    title: "Minimum Order Not Met",
                    description: `This discount code requires a minimum order of ${currencySymbol}${selectedCode.minOrderAmount.toFixed(2)}.`,
                    variant: "destructive"
                });
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


  const handlePrintWebPreview = (targetElementId: string, printMode: 'thermal' | 'pdf-web') => {
    const printableContent = document.getElementById(targetElementId);
    if (printableContent) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow?.document.write('<html><head><title>Print Invoice</title>');

      const stylesheets = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return sheet.href ? `<link href="${sheet.href}" rel="stylesheet">` : '';
          } catch (e) { /* Silently ignore same-origin policy errors for external sheets */ }
          return '';
        })
        .filter(Boolean)
        .join('');
      printWindow?.document.write(stylesheets);
      
      let printSpecificStyles = `
        body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
        #${targetElementId} { 
          box-shadow: none !important; 
          border: none !important; 
          margin: 0 auto !important;
          padding: 0 !important; 
        }
      `;
      let bodyPreviewStyle = `body { font-family: 'PT Sans', sans-serif; }`; 

      if (printMode === 'thermal') {
        printSpecificStyles += `
          @media print {
            body { font-family: monospace !important; font-size: 10pt !important; }
            #${targetElementId} { width: 100% !important; max-width: none !important; }
            img { max-width: 100%; height: auto; }
            hr { border-style: dashed !important; border-color: black !important; margin: 4px 0 !important; }
          }
          @page { size: 80mm auto; margin: 3mm; }
        `;
        bodyPreviewStyle = `body { font-family: monospace; background-color: #f0f0f0; padding: 10px; } #${targetElementId} { margin: 20px auto !important; background-color: white; padding: 5mm; box-shadow: 0 0 5px rgba(0,0,0,0.2); }`;
      } else { // pdf-web
         printSpecificStyles += `
            @media print {
                body { font-family: 'PT Sans', sans-serif !important; } 
                #${targetElementId} { width: 100% !important; }
            }
         `;
      }
      
      printWindow?.document.write(`<style>${printSpecificStyles}</style>`);
      printWindow?.document.write('</head><body style="' + bodyPreviewStyle + '">');
      printWindow?.document.write(printableContent.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.focus();
      setTimeout(() => {
        printWindow?.print();
      }, 500);
    } else {
      toast({ title: "Error", description: `Could not find invoice content to print. Target ID '${targetElementId}' not found.`, variant: "destructive" });
    }
  };

  const handlePrintThermal = async () => {
    if (!generalSettings || isLoadingGeneralSettings || isLoading) { 
        toast({ title: "Loading", description: "Printer or general settings still loading. Please wait.", variant: "default" });
        return;
    }
    const printableInvoiceData = getInvoiceDataForAction();
    if (!printableInvoiceData) {
        toast({ title: "Error", description: "No order selected for thermal printing.", variant: "destructive" });
        return;
    }

    const defaultPrinterId = generalSettings.defaultThermalPrinterId;
    const printerToUse = allPrinters.find(p => p.id === defaultPrinterId);

    if (!printerToUse) {
        toast({ title: "Printer Not Configured", description: "No default thermal printer is configured or found. Please set one in Invoice Settings.", variant: "destructive" });
        return;
    }
    
    if (printerToUse.connectionType === 'system') {
        toast({ title: "System Printer Selected", description: "Using OS print dialog for thermal receipt.", duration: 3000 });
        handlePrintWebPreview('invoice-preview-content-thermal-for-os-pos', 'thermal'); 
        return;
    }

    setIsPrintingThermal(true);
    try {
      const result = await sendTestPrintCommand({ printer: printerToUse, invoiceData: printableInvoiceData });
      if (result.success) {
        toast({ title: "Thermal Print Command Sent", description: result.message });
      } else {
        toast({ title: "Thermal Print Failed", description: result.message + (result.details ? ` Details: ${result.details}` : ''), variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Thermal Print Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handleEmailReceipt = async () => {
    const printableInvoiceData = getInvoiceDataForAction();
    if (!printableInvoiceData) {
         toast({ title: "Error", description: "No order selected to email.", variant: "destructive" });
        return;
    }
    if (isLoadingGeneralSettings) {
        toast({ title: "Error", description: "Invoice settings not loaded yet.", variant: "destructive" });
        return;
    }
    const customerEmail = printableInvoiceData.order.email || prompt("Enter customer email for receipt:", `${printableInvoiceData.order.customerName.toLowerCase().replace(/\s/g, '.')}@example.com`);
    if (!customerEmail) return; 

    const lang = printableInvoiceData.language || 'en';
    const labels = {
        invoiceTitle: t('invoiceTitle', { lng: lang }),
        billOfSupplyTitle: t('billOfSupplyTitle', { lng: lang }),
        orderId: t('orderId', { lng: lang }),
        date: t('date', { lng: lang }),
        customer: t('customer', { lng: lang }),
        table: t('table', { lng: lang }),
        phone: t('phone', { lng: lang }),
        orderType: t('orderType', { lng: lang }),
        paymentId: t('paymentId', { lng: lang }),
        paymentStatusPending: t('paymentStatusPending', { lng: lang }),
        itemsTableHeader: t('itemsTableHeader', { lng: lang }),
        qtyTableHeader: t('qtyTableHeader', { lng: lang }),
        priceTableHeader: t('priceTableHeader', { lng: lang }),
        costTableHeader: t('costTableHeader', { lng: lang }),
        totalTableHeader: t('totalTableHeader', { lng: lang }),
        itemNotePrefix: t('itemNotePrefix', { lng: lang }),
        subtotalLabel: t('subtotalLabel', { lng: lang }),
        serviceChargeLabel: t('serviceChargeLabel', { lng: lang }),
        discountLabel: t('discountLabel', { lng: lang }),
        gstLabel: t('gstLabel', { lng: lang }),
        vatLabel: t('vatLabel', { lng: lang }),
        cessLabel: t('cessLabel', { lng: lang }),
        grandTotalLabel: t('grandTotalLabel', { lng: lang }),
        totalCalculatedCostLabel: t('totalCalculatedCostLabel', { lng: lang }),
        panLabel: t('panLabel', { lng: lang }),
        gstinLabel: t('gstinLabel', { lng: lang }),
        fssaiLabel: t('fssaiLabel', { lng: lang }),
        scanForMenuOrder: t('scanForMenuOrder', { lng: lang }),
        scanToPay: t('scanToPay', { lng: lang }),
        thankYouMessage: t('thankYouMessage', { lng: lang }),
        nutritionalInfoTitle: t('nutritionalInfoTitle', { lng: lang }),
    };

    setIsSendingEmail(true);
    try {
        const result = await sendInvoiceEmail({ invoiceData: { ...printableInvoiceData, customerEmail }, labels});
        if (result.success) {
            toast({
                title: "Receipt Emailed",
                description: `Invoice for order #${String(printableInvoiceData.order.id).substring(0,8)} sent to ${customerEmail}. ${result.messageId === 'mock_message_id' ? '(Mocked for Console)' : ''}`,
            });
        } else {
             toast({ title: "Email Failed", description: result.message, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Email Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };


  const handleFilterChange = (filterName: keyof typeof filterValues, value: string) => {
    setFilterValues(prev => ({ ...prev, [filterName]: value }));
  };

  const handleDateChange = (field: 'from' | 'to', date: Date | undefined) => {
    setDateRange(prev => ({ ...prev, [field]: date }));
  };

  const clearFilters = () => {
    setFilterValues({ status: 'all', orderType: 'all', paymentType: 'all' });
    setDateRange({ from: undefined, to: undefined });
    setSearchTerm('');
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const searchMatch = searchTerm.toLowerCase() === '' ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      const statusMatch = filterValues.status === 'all' || order.status === filterValues.status;
      const typeMatch = filterValues.orderType === 'all' || order.orderType === filterValues.orderType;
      const paymentMatch = filterValues.paymentType === 'all' || order.paymentType === filterValues.paymentType;

      let dateMatch = true;
      const dateValue = order.createdAt;
      if (dateValue) {
        try {
          const orderDate = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
          if (isValid(orderDate)) {
            if (dateRange.from && dateRange.to) {
              dateMatch = isWithinInterval(orderDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
            } else if (dateRange.from) {
              dateMatch = orderDate >= startOfDay(dateRange.from);
            } else if (dateRange.to) {
              dateMatch = orderDate <= endOfDay(dateRange.to);
            }
          } else {
            dateMatch = !dateRange.from && !dateRange.to;
          }
        } catch (e) {
          console.warn(`[AdminOrdersPage] Error parsing date for order ${order.id}: "${dateValue}"`, e);
          dateMatch = !dateRange.from && !dateRange.to;
        }
      } else {
         dateMatch = !dateRange.from && !dateRange.to;
      }

      return searchMatch && statusMatch && typeMatch && paymentMatch && dateMatch;
    }).sort((a,b) => {
      try {
        const dateAObj = typeof a.createdAt === 'string' ? parseISO(a.createdAt) : a.createdAt;
        const dateBObj = typeof b.createdAt === 'string' ? parseISO(b.createdAt) : b.createdAt;
        const timeA = isValid(dateAObj) ? dateAObj.getTime() : 0;
        const timeB = isValid(dateBObj) ? dateBObj.getTime() : 0;
        return timeB - timeA;
      } catch (e) { return 0; }
    });
  }, [orders, searchTerm, filterValues, dateRange]);

  const orderStats = useMemo((): OrderStats => {
    return orders.reduce((acc, order) => {
      acc.total += 1;
      if (order.status === 'Pending') acc.pending += 1;
      if (order.status === 'Preparing') acc.preparing += 1;
      if (order.status === 'Ready for Pickup') acc.readyForPickup += 1;
      if (order.status === 'Out for Delivery') acc.outForDelivery += 1;
      if (order.status === 'Completed') acc.completed += 1;
      if (order.status === 'Cancelled') acc.cancelled += 1;
      if (order.orderType === 'Dine-in') acc.dineIn += 1;
      if (order.orderType === 'Takeaway') acc.takeaway += 1;
      try {
        const dateValue = order.createdAt;
        if (dateValue) {
            const orderDate = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
            if (isValid(orderDate) && isToday(orderDate) && order.status === 'Completed') {
                acc.revenueToday += order.total;
            }
        }
      } catch (e) { /* ignore date parsing errors for stats */ }
      return acc;
    }, { total: 0, pending: 0, preparing: 0, readyForPickup: 0, outForDelivery: 0, completed: 0, cancelled: 0, dineIn: 0, takeaway: 0, revenueToday: 0 });
  }, [orders]);


  const StatCard = ({ title, value, icon, description }: { title: string; value: string | number; icon: React.ReactNode; description?: string }) => (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="mr-1 h-3 w-3"/>{status}</Badge>;
      case 'Preparing': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300"><Utensils className="mr-1 h-3 w-3"/>{status}</Badge>;
      case 'Ready for Pickup': return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300"><ShoppingBag className="mr-1 h-3 w-3"/>{status}</Badge>;
      case 'Out for Delivery': return <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-300"><Truck className="mr-1 h-3 w-3"/>{status}</Badge>;
      case 'Completed': return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-1 h-3 w-3"/>{status}</Badge>;
      case 'Cancelled': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3"/>{status}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentBadge = (paymentType?: PaymentType) => {
    switch(paymentType) {
        case 'Card': return <Badge variant="default" className="bg-sky-500 hover:bg-sky-600"><CreditCard className="mr-1 h-3 w-3"/>{paymentType}</Badge>;
        case 'UPI': return <Badge variant="default" className="bg-indigo-500 hover:bg-indigo-600"><CreditCard className="mr-1 h-3 w-3"/>{paymentType}</Badge>;
        case 'Online': return <Badge variant="default" className="bg-lime-500 hover:bg-lime-600"><CreditCard className="mr-1 h-3 w-3"/>{paymentType}</Badge>;
        case 'Cash': return <Badge variant="secondary"><CreditCard className="mr-1 h-3 w-3"/>{paymentType}</Badge>;
        case 'Pending': default: return <Badge variant="outline"><Clock className="mr-1 h-3 w-3"/>Pending</Badge>;
    }
  }

  const invoicePreviewData = getInvoiceDataForAction();
  
  const handleActionResult = async (resultPromise: Promise<{success: boolean, message: string}>) => {
    const result = await resultPromise;
    if (result.success) {
      toast({ title: "Action Successful", description: result.message });
      await fetchAdminPageData();
    } else {
      toast({ title: "Action Failed", description: result.message, variant: "destructive" });
    }
    setIsPinDialogOpen(false);
    setPinAction(null);
    setPin('');
    setIsUpdatingWithPin(false);
  };
  
  const handleStatusChangeClick = (order: Order, newStatus: OrderStatus) => {
    const isLocked = order.status === 'Completed' || order.status === 'Cancelled';
    
    if (isLocked) {
      if (!generalSettings?.completedOrderPin) {
        toast({title: "PIN Not Set", description: "Override PIN for locked orders is not configured in General Settings.", variant: "destructive"});
        return;
      }
      setPinAction({
        title: `Change Status to "${newStatus}"`,
        action: (pinValue: string) => updateOrderStatus(order.id, newStatus, pinValue),
        orderId: order.id,
      });
      setIsPinDialogOpen(true);
    } else {
      handleActionResult(updateOrderStatus(order.id, newStatus, ""));
    }
  };

  const handlePinDialogSubmit = async () => {
    if(pinAction) {
        setIsUpdatingWithPin(true);
        await handleActionResult(pinAction.action(pin));
    }
  };


  return (
    <div className="space-y-8">
       <Dialog open={isEditorOpen} onOpenChange={(open: boolean) => { setIsEditorOpen(open); if (!open) setEditingOrder(undefined);}}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
           <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              Edit Order #{editingOrder?.id ? String(editingOrder.id).substring(0,8) : 'N/A'}...
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && editingOrder && <OrderEditor order={editingOrder} menuItems={menuItems} onSave={(data) => handleSaveOrder(data, pin)} currencySymbol={currencySymbol} convertPrice={convertPrice} />}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isPinDialogOpen} onOpenChange={(open) => {if(!open) { setPinAction(null); setPin(''); } setIsPinDialogOpen(open)}}>
        <AlertDialogContent>
          <AlertDialogHeaderComponent>
            <AlertDialogTitleComponent>{pinAction?.title || 'Admin PIN Required'}</AlertDialogTitleComponent>
            <AlertDialogDescription>
              This order is completed or cancelled. To perform this action, please enter the order override PIN.
              {user?.role === 'superadmin' && generalSettings?.completedOrderPin && (
                  <span className="block mt-2 text-xs font-mono bg-muted p-2 rounded">For your convenience, the PIN is: <strong>{generalSettings.completedOrderPin}</strong></span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeaderComponent>
          <div className="flex items-center space-x-2">
            <KeyRound className="h-4 w-4 text-muted-foreground"/>
            <Input 
                id="pin-input"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN"
            />
          </div>
          <AlertDialogFooterComponent>
            <AlertDialogCancel onClick={() => setPin('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePinDialogSubmit} disabled={isUpdatingWithPin}>
                {isUpdatingWithPin && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Confirm & Proceed
            </AlertDialogAction>
          </AlertDialogFooterComponent>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isInvoiceViewerOpen} onOpenChange={(open: boolean) => { if(!open) setViewingInvoiceOrder(undefined); setIsInvoiceViewerOpen(open); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] grid grid-rows-[auto_auto_1fr_auto] p-0">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="font-headline text-2xl text-primary">
              Invoice for Order #{viewingInvoiceOrder?.id ? String(viewingInvoiceOrder.id).substring(0,8) : 'N/A'}...
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-6 py-3 border-b bg-muted/50 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Print-Time Adjustments</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="print-discount-code" className="text-xs">Discount Code</Label>
                    <Select value={selectedDiscountCodeId} onValueChange={handleDiscountCodeSelect}>
                        <SelectTrigger id="print-discount-code" className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                        <Label htmlFor="print-discount-type" className="text-xs">Manual Discount</Label>
                        <Select value={printTimeDiscountType} onValueChange={(v) => setPrintTimeDiscountType(v as any)}>
                            <SelectTrigger id="print-discount-type" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                            <SelectItem value="none" className="text-xs">None</SelectItem>
                            <SelectItem value="percentage" className="text-xs">Percentage (%)</SelectItem>
                            <SelectItem value="fixed_amount" className="text-xs">Fixed Amount</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                        {printTimeDiscountType !== 'none' && (
                        <div className="space-y-1">
                            <Label htmlFor="print-discount-value" className="text-xs">Value</Label>
                            <Input id="print-discount-value" type="number" value={printTimeDiscountValue} onChange={e => setPrintTimeDiscountValue(Number(e.target.value))} className="h-8 text-xs"/>
                        </div>
                        )}
                    </>
                )}
                <div className="space-y-1">
                  <Label htmlFor="print-language" className="text-xs">Invoice Language</Label>
                  <Select value={printTimeLanguage} onValueChange={(v) => setPrintTimeLanguage(v as any)}>
                    <SelectTrigger id="print-language" className="h-8 text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en" className="text-xs">English</SelectItem>
                      <SelectItem value="hi" className="text-xs">Hindi (हिन्दी)</SelectItem>
                      <SelectItem value="bn" className="text-xs">Bengali (বাংলা)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="print-service-charge" className="text-xs">Service Charge (%)</Label>
                    <Input id="print-service-charge" type="number" step="0.5" value={printTimeServiceCharge ?? ''} onChange={e => setPrintTimeServiceCharge(e.target.value === '' ? undefined : Number(e.target.value))} className="h-8 text-xs"/>
                </div>
              </div>
          </div>
          
          <ScrollArea className="overflow-y-auto px-6 py-4">
            {isLoadingGeneralSettings && viewingInvoiceOrder ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading invoice settings...</div>
            ) : invoicePreviewData ? (
                <>
                    <InvoicePreview
                        data={invoicePreviewData}
                        previewType="pdf"
                        id="invoice-preview-content-orders" 
                    />
                    <div className="hidden">
                        <InvoicePreview
                            data={invoicePreviewData}
                            previewType="thermal"
                            id="invoice-preview-content-thermal-for-os-pos"
                        />
                    </div>
                </>
            ) : (
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Loading invoice data...
                </div>
            )}
          </ScrollArea>
          <DialogFooter className="p-6 border-t flex-col sm:flex-row gap-2 justify-end">
            {invoicePreviewData && (
                <>
                    <Button variant="outline" onClick={handleEmailReceipt} disabled={isSendingEmail}>
                    {isSendingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MailIcon className="mr-2 h-4 w-4"/>}
                    Email Receipt
                    </Button>
                    <Button variant="outline" onClick={() => handlePrintWebPreview('invoice-preview-content-orders', 'pdf-web')}><FileTextIcon className="mr-2 h-4 w-4"/> Print Web/PDF</Button>
                    <Button onClick={handlePrintThermal} disabled={isPrintingThermal || isLoadingGeneralSettings || isLoading}>
                        {isPrintingThermal || isLoadingGeneralSettings || isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PrinterIcon className="mr-2 h-4 w-4"/>}
                        Print Thermal
                    </Button>
                </>
            )}
            <DialogClose asChild><Button variant="ghost">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">Manage All Orders</h1>
        <p className="text-muted-foreground">Oversee orders, update statuses, and manage payments. Invoice settings loaded from global server settings. Default thermal printer from global settings.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
            <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </>
        ) : (
            <>
                <StatCard title="Total Orders" value={orderStats.total} icon={<ClipboardList className="h-5 w-5 text-muted-foreground"/>} />
                <StatCard title="Pending" value={orderStats.pending} icon={<Clock className="h-5 w-5 text-yellow-500"/>} />
                <StatCard title="Preparing" value={orderStats.preparing} icon={<Utensils className="h-5 w-5 text-blue-500"/>} />
                <StatCard title="Completed Today" value={orders.filter(o => {
                    try { const date = typeof o.createdAt === 'string' ? parseISO(o.createdAt) : o.createdAt; return o.status === 'Completed' && isValid(date) && isToday(date); }
                    catch { return false; }
                }).length} icon={<CheckCircle className="h-5 w-5 text-green-500"/>} description={`${currencySymbol}${orderStats.revenueToday.toFixed(2)} revenue`} />
            </>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline">Order List</CardTitle>
                <CardDescription>Filter and manage individual orders. Toggle between Card and Table views.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <Input
                    placeholder="Search by Order ID, Customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:w-52"
                />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4"/> Filters</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 z-50" align="end">
                        <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filter Options</h4>
                            <p className="text-sm text-muted-foreground">Refine your order list.</p>
                        </div>
                        <div className="grid gap-3">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterStatus">Status</Label>
                                <Select value={filterValues.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                    <SelectTrigger id="filterStatus" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {ALL_ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterOrderType">Order Type</Label>
                                <Select value={filterValues.orderType} onValueChange={(value) => handleFilterChange('orderType', value)}>
                                    <SelectTrigger id="filterOrderType" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {ALL_ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterPaymentType">Payment</Label>
                                <Select value={filterValues.paymentType} onValueChange={(value) => handleFilterChange('paymentType', value)}>
                                    <SelectTrigger id="filterPaymentType" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Payment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Payments</SelectItem>
                                        {ALL_PAYMENT_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <Label>Date Range</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={`h-8 justify-start text-left font-normal ${!dateRange.from && "text-muted-foreground"}`}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            {dateRange.from ? format(dateRange.from, "MMM d, yyyy") : <span>From Date</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateRange.from}
                                            onSelect={(date) => handleDateChange('from', date || undefined)}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={`h-8 justify-start text-left font-normal ${!dateRange.to && "text-muted-foreground"}`}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : <span>To Date</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={dateRange.to}
                                            onSelect={(date) => handleDateChange('to', date || undefined)}
                                            disabled={(date) => dateRange.from ? date < dateRange.from : false}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                        <Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button>
                        </div>
                    </PopoverContent>
                </Popover>
                 <div className="flex items-center rounded-md border p-1">
                    <Button variant={viewType === 'card' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewType('card')} className="p-1.5 h-auto">
                        <LayoutGrid className="h-4 w-4"/>
                    </Button>
                    <Button variant={viewType === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewType('table')} className="p-1.5 h-auto">
                        <List className="h-4 w-4"/>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center py-16">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">Loading orders...</p>
                </div>
            ) : filteredOrders.length > 0 ? (
                viewType === 'card' ? (
                    <ScrollArea className="h-[calc(100vh-25rem)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-1">
                        {filteredOrders.map(order => (
                            <Card key={order.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                                <OrderCard order={order} />
                                <CardFooter className="border-t pt-3 pb-3 flex-col space-y-2 items-stretch mt-auto">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenInvoiceViewer(order)} className="w-full">
                                        <FileTextIcon className="mr-2 h-3 w-3" /> View/Print Invoice
                                    </Button>
                                    <Button variant="default" size="sm" onClick={() => handleOpenEditor(order)} className="w-full">
                                        <Edit3 className="mr-2 h-3 w-3" /> Edit Order Details
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <ScrollArea className="h-[calc(100vh-25rem)]"> 
                        <Table>
                            <TableHeaderComponent>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeaderComponent>
                            <TableBody>
                                {filteredOrders.map(order => {
                                    const dateValue = order.createdAt;
                                    const isEdited = order.history && order.history.length > 1;
                                    const previousStatus = isEdited ? order.history![order.history!.length - 2].status : null;
                                    const formattedDate = dateValue && isValid(typeof dateValue === 'string' ? parseISO(dateValue) : dateValue)
                                        ? format(typeof dateValue === 'string' ? parseISO(dateValue) : dateValue, "MMM d, yy, h:mm a")
                                        : "Invalid Date";
                                    return (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium text-primary flex items-center gap-1">
                                            #{String(order.id).substring(0,8)}...
                                            {isEdited && (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Edit3 className="h-3 w-3 text-amber-500 cursor-help"/>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Updated from: {previousStatus}</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            )}
                                        </TableCell>
                                        <TableCell>{order.customerName}</TableCell>
                                        <TableCell>{formattedDate}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="p-1 h-auto text-left w-full justify-start font-normal">
                                                        {getStatusBadge(order.status)}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    {ALL_ORDER_STATUSES.map(status => (
                                                        <DropdownMenuItem key={status} onSelect={() => handleStatusChangeClick(order, status)} disabled={order.status === status}>
                                                            {status}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell><Badge variant={order.orderType === 'Dine-in' ? 'secondary' : 'outline'}>{order.orderType}</Badge></TableCell>
                                        <TableCell>{currencySymbol}{order.total.toFixed(2)}</TableCell>
                                        <TableCell>{getPaymentBadge(order.paymentType)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-5 w-5" />
                                                </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleOpenEditor(order)}>
                                                    <Edit3 className="mr-2 h-4 w-4" />
                                                    Edit Order
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenInvoiceViewer(order)}>
                                                    <FileTextIcon className="mr-2 h-4 w-4" />
                                                    View/Print Invoice
                                                </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )
            ) : (
                <div className="text-center py-16">
                    <PackageSearch className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
                    <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Orders Found</h2>
                    <p className="text-muted-foreground">
                        {searchTerm || Object.values(filterValues).some(v => v !== 'all') || dateRange.from || dateRange.to ?
                        "No orders match your current search/filter criteria." :
                        "There are no orders in the system yet."}
                    </p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
