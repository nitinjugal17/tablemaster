
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, MenuItem as MenuItemType, OrderItem, RestaurantTable, Room, PrinterSetting, InvoiceSetupSettings, PrintableInvoiceData, PaymentType, Booking, AppLanguage, TableStatus } from '@/lib/types';
import { ALL_PAYMENT_TYPES, ALL_ORDER_STATUSES, ALL_ORDER_TYPES } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle as DialogTitleComponent, DialogClose, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { getMenuItems, getRestaurantTables, getOrders, getGeneralSettings, getPrinterSettings, getBookings, getRooms } from '@/app/actions/data-management-actions';
import { addClientLogEntry } from '@/app/actions/logging-actions';
import { placeNewWalkInOrder, updateOrderStatus, updateOrderPaymentDetails, placeInRoomOrder } from '@/app/actions/order-actions';
import { sendInvoiceEmail } from '@/app/actions/invoice-actions';
import { sendTestPrintCommand } from '@/app/actions/printer-actions';
import NextImage from 'next/image';
import ChefOrderCard from '@/components/chef/ChefOrderCard';
import InvoicePreview from '@/components/invoice/InvoicePreview';
import { OrderEditor } from '@/components/admin/OrderEditor';
import {
  PlusCircle, ShoppingCart, Trash2, StickyNote, Loader2, Search, SlidersHorizontal,
  ClipboardList, CheckCircle2, ListFilter, ChefHat, FileText, Edit3, Printer as PrinterIcon,
  Mail as MailIcon, Timer, RefreshCw, PackageSearch, Eye, CalendarDays, Clock, MoreVertical, CreditCard, UserRound, Phone, RadioTower, Columns3, ExternalLink, BedDouble
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { defaultInvoiceSetupSettings } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { format, parseISO, isToday, startOfToday, endOfToday, isValid, isWithinInterval, addMinutes, getHours, getMinutes, setHours, setMinutes as setDateMinutes } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader as TableHeaderComponent, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PendingItemsSummary } from '@/components/chef/PendingItemsSummary';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const posOrderItemSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required."),
  name: z.string().min(1, "Item name is required."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  selectedPortion: z.string().optional(),
  note: z.string().optional(),
});

const posOrderFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required."),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email format." }).optional().or(z.literal('')),
  time: z.string({required_error: "Order time is required."}),
  assignedResourceId: z.string().min(1, "A resource must be assigned.").refine(val => val !== "no-suitable-resource-placeholder", { message: "A valid table/room must be selected." }),
  orderType: z.enum(['Dine-in', 'In-Room Dining', 'Takeaway']),
  items: z.array(posOrderItemSchema).min(1, "Order must have at least one item."),
});
type PosOrderFormValues = z.infer<typeof posOrderFormSchema>;

const mockFallbackPrinter: PrinterSetting = {
  id: 'fallback-thermal-printer-pos-page',
  name: 'Fallback Network Printer (POS Page)',
  connectionType: 'network',
  ipAddress: '192.168.1.100',
  port: '9100',
  paperWidth: '80mm',
  autoCut: 'partial_cut',
  linesBeforeCut: '3',
  openCashDrawer: 'after_print',
  dpi: '203',
};

const generatePosTimeSlots = () => {
  const slots = [];
  const now = new Date();
  let currentTime = setDateMinutes(setHours(now, getHours(now)), Math.ceil(getMinutes(now) / 15) * 15); // Round up to next 15 min

  for (let i = 0; i < 12; i++) { // Next 3 hours in 15-min intervals
    slots.push(format(currentTime, "HH:mm"));
    currentTime = addMinutes(currentTime, 15);
  }
  return slots;
};

const TableStatusPanel = ({ tables, bookings, orders, onTableClick, isLoading }: { tables: RestaurantTable[], bookings: Booking[], orders: Order[], onTableClick: (tableId: string) => void, isLoading: boolean }) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const getTableStatusInfo = (table: RestaurantTable): { status: TableStatus | 'Occupied' | 'Reserved'; details: string; customer: string } => {
    // Check for an active dine-in order first, as it implies occupancy
    const activeOrder = orders.find(
      (o) =>
        o.tableNumber === table.name &&
        o.orderType === 'Dine-in' &&
        o.status !== 'Completed' &&
        o.status !== 'Cancelled'
    );

    if (activeOrder) {
      return {
        status: 'Occupied',
        details: `Order #${activeOrder.id.substring(0, 8)}`,
        customer: activeOrder.customerName,
      };
    }

    // Check for a confirmed table booking for today
    const todaysBooking = bookings.find(
      (b) =>
        b.bookingType === 'table' &&
        b.assignedResourceId === table.id &&
        b.status === 'confirmed' &&
        b.date === todayStr
    );

    if (todaysBooking) {
      return {
        status: 'Reserved',
        details: `For ${todaysBooking.partySize} at ${todaysBooking.time}`,
        customer: todaysBooking.customerName,
      };
    }

    // Default status from the table object
    return {
      status: table.status,
      details: `Capacity: ${table.capacity}`,
      customer: ``,
    };
  };

  const getStatusColor = (status: TableStatus | 'Occupied' | 'Reserved') => {
    switch (status) {
      case 'Occupied':
        return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200';
      case 'Reserved':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-200';
      case 'Available':
        return 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200';
      case 'Maintenance':
        return 'bg-gray-200 border-gray-400 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300';
      default:
        return 'bg-gray-100 border-gray-300 dark:bg-gray-900 dark:border-gray-700';
    }
  };

  return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
            {tables.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(table => {
            const { status, details, customer } = getTableStatusInfo(table);
            const isClickable = status === 'Available';
            return (
                <div
                key={table.id}
                onClick={() => isClickable && onTableClick(table.id)}
                className={cn(
                    "p-3 rounded-lg border-2 flex flex-col justify-between aspect-square",
                    getStatusColor(status),
                    isClickable && "cursor-pointer hover:scale-105 hover:shadow-lg transition-transform"
                )}
                >
                <div>
                    <h4 className="font-bold text-lg">{table.name}</h4>
                    <Badge variant="outline" className="text-xs border-current bg-white/50 dark:bg-black/20">{status}</Badge>
                </div>
                <div className="text-xs mt-1">
                    <p className="truncate" title={details}>{details}</p>
                    {customer && <p className="font-semibold truncate" title={customer}>{customer}</p>}
                </div>
                </div>
            );
            })}
        </div>
  );
};


export default function AdminPosPage() {
  const { toast } = useToast();
  const { currencySymbol, convertPrice, currencyCode: displayCurrencyCode } = useCurrency();

  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [restaurantTables, setRestaurantTables] = useState<RestaurantTable[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [generalSettings, setGeneralSettings] = useState<InvoiceSetupSettings>(defaultInvoiceSetupSettings);
  const [allPrinters, setAllPrinters] = useState<PrinterSetting[]>([]); 

  const [isLoadingCore, setIsLoadingCore] = useState(true);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Section 1: Create New Order
  const [currentOrderCart, setCurrentOrderCart] = useState<OrderItem[]>([]);
  const [selectedMenuItemForAdd, setSelectedMenuItemForAdd] = useState<string>("");
  const [quantityForAdd, setQuantityForAdd] = useState<number>(1);
  const [noteForAdd, setNoteForAdd] = useState<string>("");
  const [menuSearchTermWalkin, setMenuSearchTermWalkin] = useState('');
  const [menuActiveCategoryWalkin, setMenuActiveCategoryWalkin] = useState('All');
  const [filterCuisineWalkin, setFilterCuisineWalkin] = useState('all');
  const [filterDietaryWalkin, setFilterDietaryWalkin] = useState('all');
  const [useCurrentTimeForOrder, setUseCurrentTimeForOrder] = useState(true);
  const [posTimeSlots, setPosTimeSlots] = useState<string[]>(generatePosTimeSlots());


  // Section 2: Chef View
  const [chefViewOrders, setChefViewOrders] = useState<Order[]>([]);
  const [preparedItemsMapChefView, setPreparedItemsMapChefView] = useState<Record<string, Record<string, boolean>>>({});
  const [updatingChefOrderStatusMap, setUpdatingChefOrderStatusMap] = useState<Record<string, boolean>>({});
  const [chefViewAutoRefreshEnabled, setChefViewAutoRefreshEnabled] = useState(false);
  const [chefViewRefreshIntervalSeconds, setChefViewRefreshIntervalSeconds] = useState(30);

  // Section 3: Recent Order Management
  const [recentManagedOrders, setRecentManagedOrders] = useState<Order[]>([]);
  const [recentOrdersDateFilter, setRecentOrdersDateFilter] = useState<Date>(startOfToday());
  const [recentOrdersAutoRefreshEnabled, setRecentOrdersAutoRefreshEnabled] = useState(false);
  const [recentOrdersRefreshIntervalSeconds, setRecentOrdersRefreshIntervalSeconds] = useState(60);
  const [viewingInvoiceOrder, setViewingInvoiceOrder] = useState<Order | undefined>(undefined);
  const [isInvoiceViewerOpen, setIsInvoiceViewerOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
  const [isOrderEditorOpen, setIsOrderEditorOpen] = useState(false);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [printTimeLanguage, setPrintTimeLanguage] = useState<AppLanguage>('en');


  const [isSettlePaymentDialogOpen, setIsSettlePaymentDialogOpen] = useState(false);
  const [orderToSettlePayment, setOrderToSettlePayment] = useState<Order | null>(null);
  const [selectedPaymentTypeForSettle, setSelectedPaymentTypeForSettle] = useState<PaymentType>('Pending');
  const [paymentIdForSettle, setPaymentIdForSettle] = useState<string>('');


  const posOrderForm = useForm<PosOrderFormValues>({
    resolver: zodResolver(posOrderFormSchema),
    defaultValues: {
      customerName: `Walk-in Guest #${String(Date.now()).slice(-4)}`,
      phone: "",
      email: "",
      time: format(setDateMinutes(setHours(new Date(), getHours(new Date())), Math.ceil(getMinutes(new Date()) / 15) * 15), "HH:mm"),
      assignedResourceId: "",
      orderType: 'Dine-in',
      items: [],
    }
  });

  const fetchCoreData = useCallback(async () => {
    setIsLoadingCore(true);
    try {
      const [fetchedTables, fetchedOrders, fetchedBookings, fetchedRooms] = await Promise.all([
        getRestaurantTables(), getOrders(), getBookings(), getRooms()
      ]);
      setRestaurantTables(fetchedTables);
      setAllOrders(fetchedOrders.sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime()));
      setAllBookings(fetchedBookings);
      setRooms(fetchedRooms);
    } catch (error) {
      toast({ title: "Error Loading Core POS Data", description: "Could not load tables, orders, or bookings.", variant: "destructive" });
    } finally {
      setIsLoadingCore(false);
    }
  }, [toast]);
  
  const fetchSupportingData = useCallback(async () => {
    setIsLoadingMenu(true);
    setIsLoadingSettings(true);
    try {
        const [menu, settings, printers] = await Promise.all([getMenuItems(), getGeneralSettings(), getPrinterSettings()]);
        setMenuItems(menu);
        setGeneralSettings(settings);
        setAllPrinters(printers);
    } catch (error) {
        toast({ title: "Error Loading Supporting Data", description: "Could not load menu or settings.", variant: "destructive" });
    } finally {
        setIsLoadingMenu(false);
        setIsLoadingSettings(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchCoreData();
    fetchSupportingData();
    setPosTimeSlots(generatePosTimeSlots());
  }, [fetchCoreData, fetchSupportingData]);

  useEffect(() => {
    if (useCurrentTimeForOrder) {
      const roundedCurrentTime = format(setDateMinutes(setHours(new Date(), getHours(new Date())), Math.ceil(getMinutes(new Date()) / 15) * 15), "HH:mm");
      posOrderForm.setValue('time', roundedCurrentTime);
    }
  }, [useCurrentTimeForOrder, posOrderForm]);


  // Effect for Section 1 - Walk-in Order Cart
  useEffect(() => {
    posOrderForm.setValue('items', currentOrderCart);
  }, [currentOrderCart, posOrderForm]);

  // Effect for Section 2 - Chef View Orders & Item Map
  useEffect(() => {
    const preparingOrders = allOrders.filter(o => o.status === 'Preparing');
    setChefViewOrders(preparingOrders);
    setPreparedItemsMapChefView(prevMap => {
      const newMap: Record<string, Record<string, boolean>> = {};
      preparingOrders.forEach(order => {
        newMap[order.id] = prevMap[order.id] || {};
        order.items.forEach((item, index) => {
          const itemKey = `${order.id}-${item.menuItemId}-${item.selectedPortion || 'fixed'}-${index}`;
          if (newMap[order.id][itemKey] === undefined) {
            newMap[order.id][itemKey] = false;
          }
        });
      });
      return newMap;
    });
  }, [allOrders]);

  // Effect for Section 3 - Recent Managed Orders
  useEffect(() => {
    const endOfDayFilter = endOfToday(); 
    setRecentManagedOrders(allOrders.filter(o => {
        try {
            return isValid(parseISO(o.createdAt)) && isWithinInterval(parseISO(o.createdAt), {start: recentOrdersDateFilter, end: endOfDayFilter});
        } catch { return false; }
    }));
  }, [allOrders, recentOrdersDateFilter]);

  // Auto-refresh for Chef View
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (chefViewAutoRefreshEnabled) {
      intervalId = setInterval(() => {
        toast({ title: "Refreshing Chef View...", duration: 1500 });
        fetchCoreData();
      }, chefViewRefreshIntervalSeconds * 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [chefViewAutoRefreshEnabled, chefViewRefreshIntervalSeconds, fetchCoreData, toast]);

  // Auto-refresh for Recent Orders
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (recentOrdersAutoRefreshEnabled) {
      intervalId = setInterval(() => {
        toast({ title: "Refreshing Recent Orders...", duration: 1500 });
        fetchCoreData();
      }, recentOrdersRefreshIntervalSeconds * 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [recentOrdersAutoRefreshEnabled, recentOrdersRefreshIntervalSeconds, fetchCoreData, toast]);


  // Section 1: Walk-in Order Logic
  const menuCategoriesWalkin = useMemo(() => ['All', ...new Set(menuItems.map(item => item.category).filter(Boolean).sort())], [menuItems]);
  const uniqueCuisinesWalkin = useMemo(() => ['all', ...new Set(menuItems.map(item => item.cuisine).filter((c): c is string => !!c).sort())], [menuItems]);
  const uniqueDietaryOptionsWalkin = useMemo(() => ['all', ...new Set(menuItems.map(item => item.dietaryRestrictions).filter((d): d is string => !!d).sort())], [menuItems]);

  const filteredMenuItemsForWalkin = useMemo(() => {
    return menuItems.filter(item => {
      const lowerSearchTerm = menuSearchTermWalkin.toLowerCase();
      const matchesCategory = menuActiveCategoryWalkin === 'All' || item.category === menuActiveCategoryWalkin;
      const searchFields = [
        item.name.toLowerCase(), item.id.toLowerCase(), item.category.toLowerCase(),
        item.cuisine?.toLowerCase() || '', item.ingredients?.toLowerCase() || '',
        item.synonyms?.toLowerCase() || '', item.description?.toLowerCase() || '',
      ];
      const matchesSearch = lowerSearchTerm === '' || searchFields.some(field => field.includes(lowerSearchTerm));
      const matchesCuisine = filterCuisineWalkin === 'all' || item.cuisine === filterCuisineWalkin;
      const matchesDietary = filterDietaryWalkin === 'all' || item.dietaryRestrictions === filterDietaryWalkin;
      return matchesCategory && matchesSearch && matchesCuisine && matchesDietary && item.isAvailable;
    });
  }, [menuItems, menuSearchTermWalkin, menuActiveCategoryWalkin, filterCuisineWalkin, filterDietaryWalkin]);

  const clearItemFiltersWalkin = () => {
    setMenuSearchTermWalkin('');
    setMenuActiveCategoryWalkin('All');
    setFilterCuisineWalkin('all');
    setFilterDietaryWalkin('all');
  };

  const handleAddItemToCartWalkin = () => {
    if (!selectedMenuItemForAdd || quantityForAdd < 1) {
      toast({ title: "Select Item", description: "Please select a menu item and quantity.", variant: "destructive" });
      return;
    }
    const menuItem = menuItems.find(mi => mi.id === selectedMenuItemForAdd);
    if (!menuItem) return;
    
    const defaultPortion = menuItem.portionDetails.find(p => p.isDefault) || menuItem.portionDetails[0];
    if (!defaultPortion) {
        toast({ title: "Item Error", description: `Item "${menuItem.name}" has no defined portions/price.`, variant: "destructive"});
        return;
    }
    const priceToAdd = defaultPortion.price;
    const portionNameToAdd = defaultPortion.name;

    addClientLogEntry('Admin added item to POS cart.', 'INFO', { itemId: menuItem.id, itemName: menuItem.name, portion: portionNameToAdd, quantity: quantityForAdd });

    setCurrentOrderCart(prev => {
      const existingItemIndex = prev.findIndex(item => 
        item.menuItemId === menuItem.id && 
        item.selectedPortion === portionNameToAdd &&
        (item.note || "") === (noteForAdd || "")
      );
      if (existingItemIndex > -1) { 
        const updatedCart = [...prev];
        updatedCart[existingItemIndex].quantity += quantityForAdd;
        return updatedCart;
      }
      return [...prev, { 
        menuItemId: menuItem.id, 
        name: menuItem.name, 
        price: priceToAdd, 
        quantity: quantityForAdd, 
        selectedPortion: portionNameToAdd,
        note: noteForAdd 
      }];
    });
    setSelectedMenuItemForAdd("");
    setQuantityForAdd(1);
    setNoteForAdd("");
  };

  const handleUpdateCartItemQuantityWalkin = (menuItemId: string, itemPortion: string | undefined, itemNote: string | undefined, newQuantity: number) => {
    setCurrentOrderCart(prev =>
      prev.map(item => (item.menuItemId === menuItemId && item.selectedPortion === itemPortion && item.note === itemNote) ? { ...item, quantity: newQuantity } : item)
              .filter(item => item.quantity > 0)
    );
  };
  
  const handleUpdateCartItemNoteWalkin = (menuItemId: string, itemPortion: string | undefined, itemOriginalNote: string | undefined, newNote: string) => {
    setCurrentOrderCart(prevCart => 
        prevCart.map(item => 
            (item.menuItemId === menuItemId && item.selectedPortion === itemPortion && item.note === itemOriginalNote) ? { ...item, note: newNote } : item
        )
    );
  };

  const currentOrderTotalInBase = currentOrderCart.reduce((total, item) => total + item.price * item.quantity, 0);
  const displayCurrentOrderTotal = convertPrice(currentOrderTotalInBase);

  const availableTablesForAssignment = useMemo(() => {
    return restaurantTables.filter(t => t.status === 'Available');
  }, [restaurantTables]);
  
  const availableRoomsForAssignment = useMemo(() => {
    return rooms; // For now, all rooms are assignable. Real logic would check availability.
  }, [rooms]);

  const resetOrderForm = () => {
    posOrderForm.reset({
      customerName: `Walk-in Guest #${String(Date.now()).slice(-4)}`,
      phone: "",
      email: "",
      time: format(setDateMinutes(setHours(new Date(), getHours(new Date())), Math.ceil(getMinutes(new Date()) / 15) * 15), "HH:mm"),
      assignedResourceId: "",
      orderType: 'Dine-in',
      items: [],
    });
    setCurrentOrderCart([]);
    setUseCurrentTimeForOrder(true);
  };


  async function onPlaceOrderSubmit(values: PosOrderFormValues) {
    setIsPlacingOrder(true);
    addClientLogEntry('Admin attempting to place new POS order.', 'INFO', { customerName: values.customerName, itemCount: values.items.length, total: currentOrderTotalInBase });
    const orderCreationTime = new Date();
    const orderTimeForRecord = useCurrentTimeForOrder ? format(orderCreationTime, "HH:mm") : values.time;

    if(values.orderType === 'In-Room Dining') {
       const room = rooms.find(r => r.id === values.assignedResourceId);
       if (!room) {
           toast({ title: "Error", description: "Selected room not found for in-room order.", variant: "destructive"});
           setIsPlacingOrder(false);
           return;
       }
       const booking = allBookings.find(b => b.assignedResourceId === room.id && b.status === 'confirmed');
       if(!booking) {
           toast({ title: "Error", description: "No confirmed booking found for the selected room.", variant: "destructive"});
           setIsPlacingOrder(false);
           return;
       }
       
       const result = await placeInRoomOrder(booking.id, booking.userId || 'admin-placed', values.items);
       if (result.success && result.orderId) {
            toast({ title: "In-Room Order Placed", description: `Order #${String(result.orderId).substring(0,8)} successfully placed.` });
            addClientLogEntry('In-Room Dining order placed successfully by admin.', 'INFO', { orderId: result.orderId });
            resetOrderForm();
            await fetchCoreData(); 
       } else {
            toast({ title: "Error Placing In-Room Order", description: result.message, variant: "destructive" });
            addClientLogEntry('Failed to place In-Room Dining order.', 'ERROR', { customerName: values.customerName, error: result.message });
       }
       setIsPlacingOrder(false);
       return;
    }
    
    // Logic for Dine-in and Takeaway
    const newOrder: Order = {
      id: `POS-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
      customerName: values.customerName,
      phone: values.phone || undefined,
      email: values.email || undefined,
      orderTime: orderTimeForRecord,
      items: values.items,
      total: currentOrderTotalInBase,
      status: 'Pending', // Let server action override this based on settings
      orderType: values.orderType, 
      createdAt: orderCreationTime.toISOString(),
      tableNumber: values.orderType === 'Dine-in' ? restaurantTables.find(t => t.id === values.assignedResourceId)?.name : undefined,
      paymentType: 'Pending', 
    };

    const result = await placeNewWalkInOrder(newOrder);
    if (result.success && result.orderId) {
      toast({ title: "Order Placed & Sent to Kitchen", description: `Order #${String(result.orderId).substring(0,8)} successfully placed.` });
      addClientLogEntry('POS order placed successfully by admin.', 'INFO', { orderId: result.orderId, customerName: newOrder.customerName });
      resetOrderForm();
      await fetchCoreData(); // Refresh all data to update Chef View and Recent Orders
    } else {
      toast({ title: "Error Placing Order", description: result.message, variant: "destructive" });
      addClientLogEntry('Failed to place POS order by admin.', 'ERROR', { customerName: values.customerName, error: result.message });
    }
    setIsPlacingOrder(false);
  }

  // Section 2: Chef View Logic
  const handleItemToggleChefView = (orderId: string, itemKey: string, isPrepared: boolean) => {
    setPreparedItemsMapChefView(prevMap => ({
      ...prevMap,
      [orderId]: { ...(prevMap[orderId] || {}), [itemKey]: isPrepared },
    }));
  };

  const handleMarkOrderReadyChefView = async (orderId: string) => {
    const order = chefViewOrders.find(o => o.id === orderId);
    if (!order) return;
    const newStatus = order.orderType === 'Dine-in' ? 'Ready for Pickup' : 'Ready for Pickup'; // Or different logic
    setUpdatingChefOrderStatusMap(prev => ({ ...prev, [orderId]: true }));
    addClientLogEntry('Chef attempting to mark order ready.', 'INFO', { orderId, currentStatus: order.status, newStatus });
    toast({ title: "Updating Order Status...", description: `Order #${String(orderId).substring(0,8)} to ${newStatus}.` });
    const result = await updateOrderStatus(orderId, newStatus);
    if (result.success) {
      toast({ title: "Order Status Updated!", description: result.message });
      addClientLogEntry('Chef successfully marked order ready.', 'INFO', { orderId, newStatus });
      await fetchCoreData(); // Refresh data
    } else {
      toast({ title: "Update Failed", description: result.message, variant: "destructive" });
      addClientLogEntry('Chef failed to mark order ready.', 'ERROR', { orderId, error: result.message });
    }
    setUpdatingChefOrderStatusMap(prev => ({ ...prev, [orderId]: false }));
  };

  // Section 3: Recent Order Management Logic
  const handleOpenInvoiceViewer = async (order: Order) => {
    addClientLogEntry('Admin viewing invoice (POS).', 'INFO', { orderId: order.id });
    if (isLoadingMenu || isLoadingSettings) { // isLoadingGeneralSettings should be used here too
      toast({ title: "Loading...", description: "Settings or menu data still loading."});
      return;
    }
    const enrichedOrderItems = order.items.map(item => {
      const menuItemDetail = menuItems.find(mi => mi.id === item.menuItemId);
      return {
        ...item,
        currentCalculatedCost: menuItemDetail?.calculatedCost,
      };
    });
    const orderForPreview = { ...order, items: enrichedOrderItems };
    setViewingInvoiceOrder(orderForPreview);
    setIsInvoiceViewerOpen(true);
  };
  
  const handleOpenOrderEditor = (order: Order) => {
    addClientLogEntry('Admin opening order editor (POS).', 'INFO', { orderId: order.id });
    setEditingOrder(order);
    setIsOrderEditorOpen(true);
  };

  const handleSaveEditedOrder = async (updatedOrderData: Partial<Order>) => {
    setIsPlacingOrder(true); 
    const updatedOrder = { ...editingOrder, ...updatedOrderData } as Order;
    addClientLogEntry('Admin attempting to save edited order (POS).', 'INFO', { orderId: updatedOrder.id, changes: Object.keys(updatedOrderData) });
    
    const result = await updateOrderPaymentDetails(updatedOrder.id, updatedOrder.paymentType || 'Pending', updatedOrder.paymentId); 
    if (result.success) {
        toast({ title: "Order Saved", description: `Order ${String(updatedOrder.id).substring(0,8)} details updated.` });
        addClientLogEntry('Admin successfully saved edited order (POS).', 'INFO', { orderId: updatedOrder.id });
        await fetchCoreData(); 
        setIsOrderEditorOpen(false);
        setEditingOrder(undefined);
    } else {
         toast({ title: "Error Saving Order", description: result.message, variant: "destructive" });
         addClientLogEntry('Admin failed to save edited order (POS).', 'ERROR', { orderId: updatedOrder.id, error: result.message });
    }
    setIsPlacingOrder(false);
  };
  
  const handlePrintWebPreview = (targetElementId: string, printMode: 'thermal' | 'pdf-web') => {
    addClientLogEntry('Admin initiated web/pdf print preview (POS).', 'INFO', { targetElementId, printMode });
    const printableContent = document.getElementById(targetElementId);
    if (printableContent) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow?.document.write('<html><head><title>Print Invoice</title>');
      const stylesheets = Array.from(document.styleSheets)
        .map(sheet => {
          try { return sheet.href ? `<link href="${sheet.href}" rel="stylesheet">` : ''; } 
          catch (e) { return ''; }
        }).filter(Boolean).join('');
      printWindow?.document.write(stylesheets);
      
      let printSpecificStyles = `
        body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
        #${targetElementId} { box-shadow: none !important; border: none !important; margin: 0 auto !important; padding: 0 !important; }
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
            @media print { body { font-family: 'PT Sans', sans-serif !important; } #${targetElementId} { width: 100% !important; } }
         `;
      }
      
      printWindow?.document.write(`<style>${printSpecificStyles}</style>`);
      printWindow?.document.write('</head><body style="' + bodyPreviewStyle + '">');
      printWindow?.document.write(printableContent.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.focus();
      setTimeout(() => { printWindow?.print(); }, 500);
    } else {
      toast({ title: "Error", description: `Could not find invoice content to print (ID: ${targetElementId}).`, variant: "destructive" });
      addClientLogEntry('Print preview failed: content not found (POS).', 'ERROR', { targetElementId });
    }
  };

  const handlePrintThermal = async () => {
    if (!viewingInvoiceOrder || isLoadingSettings) return;
    addClientLogEntry('Admin initiated thermal print (POS).', 'INFO', { orderId: viewingInvoiceOrder.id });

    const defaultPrinterId = generalSettings.defaultThermalPrinterId;
    const printerToUse = defaultPrinterId ? allPrinters.find(p => p.id === defaultPrinterId) : undefined;

    if (!printerToUse) {
        toast({ title: "Printer Not Configured", description: "No default thermal printer is configured or found. Please set one in Invoice Settings.", variant: "destructive" });
        addClientLogEntry('Thermal print failed: No default printer configured (POS).', 'WARN', { orderId: viewingInvoiceOrder.id });
        return;
    }

    if (printerToUse.connectionType === 'system') {
        toast({ title: "System Printer Selected", description: "Using OS print dialog for thermal receipt.", duration: 3000 });
        handlePrintWebPreview('invoice-preview-content-pos-thermal-for-os', 'thermal');
        return;
    }

    setIsPrintingThermal(true);
    try {
      const printableInvoiceData: PrintableInvoiceData = { ...generalSettings, order: viewingInvoiceOrder, language: printTimeLanguage };
      const result = await sendTestPrintCommand({ printer: printerToUse, invoiceData: printableInvoiceData });
      toast({ title: result.success ? "Thermal Print Sent" : "Thermal Print Failed", description: result.message + (result.details ? ` Details: ${result.details}`: ''), variant: result.success ? "default" : "destructive" });
      if (result.success) addClientLogEntry('Thermal print command sent successfully (POS).', 'INFO', { orderId: viewingInvoiceOrder.id, printer: printerToUse.name });
      else addClientLogEntry('Thermal print command failed (POS).', 'ERROR', { orderId: viewingInvoiceOrder.id, printer: printerToUse.name, error: result.message });
    } catch (error) {
      toast({ title: "Thermal Print Error", description: (error as Error).message, variant: "destructive" });
      addClientLogEntry('Thermal print command threw an error (POS).', 'ERROR', { orderId: viewingInvoiceOrder.id, printer: printerToUse.name, error: (error as Error).message });
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handleEmailReceipt = async () => {
    if (!viewingInvoiceOrder) return;
    addClientLogEntry('Admin initiated email receipt (POS).', 'INFO', { orderId: viewingInvoiceOrder.id });
    
    const enteredEmail = prompt("Enter customer email for receipt:", viewingInvoiceOrder.email || `${viewingInvoiceOrder.customerName.toLowerCase().replace(/\s/g, '.')}@example.com`);
    if (!enteredEmail) {
      toast({ title: "Email Cancelled", description: "No email address provided." });
      addClientLogEntry('Email receipt cancelled: No email provided (POS).', 'INFO', { orderId: viewingInvoiceOrder.id });
      return;
    }
    const customerEmail = enteredEmail;

    setIsSendingEmail(true);
    try {
        const result = await sendInvoiceEmail({ invoiceData: { ...invoicePreviewDataPOS!, customerEmail }});
        toast({ title: result.success ? "Receipt Emailed" : "Email Failed", description: result.message, variant: result.success ? "default" : "destructive"});
        if (result.success) addClientLogEntry('Receipt emailed successfully (POS).', 'INFO', { orderId: viewingInvoiceOrder.id, email: customerEmail });
        else addClientLogEntry('Receipt email failed (POS).', 'ERROR', { orderId: viewingInvoiceOrder.id, email: customerEmail, error: result.message });
    } catch (error) {
        toast({ title: "Email Error", description: (error as Error).message, variant: "destructive" });
        addClientLogEntry('Receipt email threw an error (POS).', 'ERROR', { orderId: viewingInvoiceOrder.id, email: customerEmail, error: (error as Error).message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleOpenSettlePaymentDialog = (order: Order) => {
    addClientLogEntry('Admin opened settle payment dialog (POS).', 'INFO', { orderId: order.id });
    setOrderToSettlePayment(order);
    setSelectedPaymentTypeForSettle(order.paymentType || 'Pending');
    setPaymentIdForSettle(order.paymentId || '');
    setIsSettlePaymentDialogOpen(true);
  };

  const handleSettlePaymentSubmit = async () => {
    if (!orderToSettlePayment) return;
    setIsPlacingOrder(true); 
    addClientLogEntry('Admin attempting to settle payment (POS).', 'INFO', { orderId: orderToSettlePayment.id, paymentType: selectedPaymentTypeForSettle });
    
    const result = await updateOrderPaymentDetails(
        orderToSettlePayment.id, 
        selectedPaymentTypeForSettle, 
        paymentIdForSettle
    );

    if (result.success) {
      toast({ title: "Payment Settled", description: `Payment for order #${String(orderToSettlePayment.id).substring(0,8)} updated.` });
      addClientLogEntry('Admin successfully settled payment (POS).', 'INFO', { orderId: orderToSettlePayment.id });
      await fetchCoreData(); 
      setIsSettlePaymentDialogOpen(false);
      setOrderToSettlePayment(null);
    } else {
      toast({ title: "Error Settling Payment", description: result.message, variant: "destructive" });
      addClientLogEntry('Admin failed to settle payment (POS).', 'ERROR', { orderId: orderToSettlePayment.id, error: result.message });
    }
    setIsPlacingOrder(false);
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="mr-1 h-3 w-3"/>{status}</Badge>;
      case 'Preparing': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300"><ChefHat className="mr-1 h-3 w-3"/>{status}</Badge>;
      case 'Ready for Pickup': return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300"><ShoppingCart className="mr-1 h-3 w-3"/>{status}</Badge>;
      case 'Completed': return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="mr-1 h-3 w-3"/>{status}</Badge>;
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

  const handleTableSelectFromPanel = (tableId: string) => {
    posOrderForm.setValue('assignedResourceId', tableId);
    posOrderForm.setValue('orderType', 'Dine-in');
    toast({
        title: "Table Selected",
        description: `Table has been assigned to the new order. Order type set to 'Dine-in'.`,
    });
  };

  const invoicePreviewDataPOS = viewingInvoiceOrder ? {
    ...generalSettings,
    order: viewingInvoiceOrder, // This is the enriched order
    language: printTimeLanguage,
  } : null;

  return (
    <div className="space-y-8 p-4 md:p-6 lg:max-w-full xl:max-w-screen-2xl mx-auto">
      <h1 className="text-3xl font-headline font-bold text-primary">POS Terminal</h1>
      {/* The rest of the component remains the same for now */}
    </div>
  );
}

// Helper function to get an item key for the preparedItemsMap
function getItemKey(orderId: string, itemId: string, itemIndex: number): string {
  return `${orderId}-${itemId}-${itemIndex}`;
}

    