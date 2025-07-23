
"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Booking, RestaurantTable, Room, BookingStatus, MenuItem as MenuItemType, OrderItem, MenuItemPortion } from '@/lib/types';
import { ALL_BOOKING_STATUSES } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader as TableHeaderComponent, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getBookings, getRestaurantTables, getRooms, getMenuItems } from '@/app/actions/data-management-actions'; 
import { addClientLogEntry } from '@/app/actions/logging-actions';
import { updateBookingDetails, saveNewBooking, sendBookingConfirmationEmail, deleteBooking } from '@/app/actions/booking-actions';
import { format, parseISO, isValid, isWithinInterval, startOfDay, endOfDay, addMinutes, setHours, setMinutes, getHours, getMinutes as getDateMinutes } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader as AlertDialogHeaderComponent, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MoreVertical, SlidersHorizontal, CalendarDays, Users, Columns3, PackageSearch, CheckCircle, XCircle, ClockIcon, SquarePen, Trash2, PlusCircle, ShoppingCart, Utensils, StickyNote, MessageSquare, Search, ChevronDown, Timer, RefreshCw, BedDouble } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { useCurrency } from '@/hooks/useCurrency';
import NextImage from 'next/image';
import { Switch } from '@/components/ui/switch';
import { parsePortionDetails } from '@/lib/utils';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { useAuth } from '@/context/AuthContext';


const availableTimes = Array.from({ length: 48 }, (_, i) => {
  const totalMinutes = i * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
});

const quickBookingFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required (can be 'Walk-in')."),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email format." }).optional().or(z.literal('')),
  partySize: z.coerce.number().min(1, "Party size must be at least 1."),
  date: z.date({ required_error: "Booking date is required." }),
  time: z.string({ required_error: "Booking time is required." }),
  bookingType: z.enum(['table', 'room']),
  assignedResourceId: z.string().min(1, "A resource must be assigned.").refine(val => val !== "no-suitable-resource-placeholder", { message: "A valid table/room must be selected." }),
  notes: z.string().optional(),
  preOrderItems: z.array(z.object({
    menuItemId: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.coerce.number().min(1),
    selectedPortion: z.string().optional(),
    note: z.string().optional(),
  })).optional(),
});
type QuickBookingFormValues = z.infer<typeof quickBookingFormSchema>;

export default function AdminBookingsManagementPage() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currencySymbol, convertPrice, currencyCode: displayCurrencyCode } = useCurrency();
  const { settings: generalSettings } = useGeneralSettings();
  const { user } = useAuth();

  const [bookingForAction, setBookingForAction] = useState<Booking | null>(null);
  const [isUpdateStatusDialogOpen, setIsUpdateStatusDialogOpen] = useState(false);
  const [isEditBookingDialogOpen, setIsEditBookingDialogOpen] = useState(false);
  const [targetStatusForUpdate, setTargetStatusForUpdate] = useState<BookingStatus | null>(null);
  const [resourceToAssign, setResourceToAssign] = useState<string | undefined>(undefined);
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);
  const [isDeletingBooking, setIsDeletingBooking] = useState(false);
  
  const [editedDate, setEditedDate] = useState<Date | undefined>(undefined);
  const [editedTime, setEditedTime] = useState<string | undefined>(undefined);

  const [isQuickCreateDialogOpen, setIsQuickCreateDialogOpen] = useState(false);
  const [isSavingQuickBooking, setIsSavingQuickBooking] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState({
    status: 'all',
    dateRangeFrom: undefined as Date | undefined,
    dateRangeTo: undefined as Date | undefined,
    bookingType: 'all',
  });

  const [menuSearchTermDialog, setMenuSearchTermDialog] = useState('');
  const [selectedCategoriesDialog, setSelectedCategoriesDialog] = useState<string[]>([]);
  const [filterCuisineDialog, setFilterCuisineDialog] = useState<string>('all');
  const [filterDietaryDialog, setFilterDietaryDialog] = useState<string>('all');

  const [autoRefreshBookingsEnabled, setAutoRefreshBookingsEnabled] = useState(false);
  const [bookingsRefreshIntervalSeconds, setBookingsRefreshIntervalSeconds] = useState(60);

  const quickBookingForm = useForm<QuickBookingFormValues>({
    resolver: zodResolver(quickBookingFormSchema),
    defaultValues: {
      customerName: "Walk-in Guest",
      phone: "0000000000",
      email: "",
      partySize: 1,
      date: new Date(),
      bookingType: 'table',
      assignedResourceId: "",
      notes: "",
      preOrderItems: [],
    }
  });

  useEffect(() => {
    // Set default time after client-side hydration to avoid mismatch
    if (typeof window !== 'undefined') {
        const now = new Date();
        let currentHour = getHours(now);
        let currentMinute = getDateMinutes(now);
        if (currentMinute > 0 && currentMinute <=30) currentMinute = 30;
        else if (currentMinute > 30) { currentMinute = 0; currentHour = (currentHour + 1) % 24; }
        const defaultTime = `${String(currentHour).padStart(2,'0')}:${String(currentMinute).padStart(2,'0')}`;
        quickBookingForm.setValue('time', defaultTime);
    }
  }, [quickBookingForm]);

  const [quickBookingCart, setQuickBookingCart] = useState<OrderItem[]>([]);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedBookings, fetchedTables, fetchedRooms, fetchedMenuItems] = await Promise.all([
        getBookings(),
        getRestaurantTables(),
        getRooms(),
        getMenuItems(),
      ]);
      setAllBookings(fetchedBookings);
      setTables(fetchedTables);
      setRooms(fetchedRooms);
      setMenuItems(fetchedMenuItems.filter(item => item.isAvailable)); 
    } catch (error) {
      toast({ title: "Error Loading Data", description: "Could not load bookings, tables, rooms, or menu items.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefreshBookingsEnabled) {
      intervalId = setInterval(() => {
        toast({ title: "Auto-Refreshing Bookings...", description: `Fetching latest booking data.`, duration: 2000 });
        fetchData();
      }, bookingsRefreshIntervalSeconds * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefreshBookingsEnabled, bookingsRefreshIntervalSeconds, fetchData, toast]);


  const uniqueCategoriesForDialog = useMemo(() => Array.from(new Set(menuItems.map(item => item.category).filter(Boolean).sort())), [menuItems]);
  const uniqueCuisinesForDialog = useMemo(() => ['all', ...Array.from(new Set(menuItems.map(item => item.cuisine).filter((c): c is string => !!c).sort()))], [menuItems]);
  const uniqueDietaryOptionsForDialog = useMemo(() => ['all', ...Array.from(new Set(menuItems.map(item => item.dietaryRestrictions).filter((c): c is string => !!c).sort()))], [menuItems]);

  const handleCategoryChangeDialog = (category: string) => {
    setSelectedCategoriesDialog(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };
  const getCategoryButtonTextDialog = () => selectedCategoriesDialog.length === 0 ? "All Categories" : selectedCategoriesDialog.length === 1 ? selectedCategoriesDialog[0] : `${selectedCategoriesDialog.length} Categories Selected`;
  const clearPreOrderFiltersDialog = () => { setMenuSearchTermDialog(''); setSelectedCategoriesDialog([]); setFilterCuisineDialog('all'); setFilterDietaryDialog('all'); };

  const filteredMenuItemsForDialog = useMemo(() => {
    const potentialIdMatch = menuItems.find(item => String(item.id) === menuSearchTermDialog.trim());
    if (potentialIdMatch) {
        return [potentialIdMatch];
    }
    
    return menuItems.filter(item => {
      const lowerSearchTerm = menuSearchTermDialog.toLowerCase();
      const matchesCategory = selectedCategoriesDialog.length === 0 || selectedCategoriesDialog.includes(item.category);
      const searchFields = [
          item.name.toLowerCase(), 
          String(item.id || '').toLowerCase(), 
          item.category.toLowerCase(), 
          item.cuisine?.toLowerCase() || '', 
          item.ingredients?.toLowerCase() || '', 
          item.synonyms?.toLowerCase() || '', 
          item.description?.toLowerCase() || '',
      ];
      const matchesSearch = lowerSearchTerm === '' || searchFields.some(field => field.includes(lowerSearchTerm));
      const matchesCuisine = filterCuisineDialog === 'all' || item.cuisine === filterCuisineDialog;
      const matchesDietary = filterDietaryDialog === 'all' || item.dietaryRestrictions === filterDietaryDialog;
      return matchesCategory && matchesSearch && matchesCuisine && matchesDietary && item.isAvailable;
    });
  }, [menuItems, menuSearchTermDialog, selectedCategoriesDialog, filterCuisineDialog, filterDietaryDialog]);


  const handleOpenStatusUpdateDialog = (booking: Booking, targetStatus: BookingStatus) => {
    setBookingForAction(booking);
    setTargetStatusForUpdate(targetStatus);
    setResourceToAssign(booking.assignedResourceId || booking.requestedResourceId || undefined);
    setAdminNotes("");
    setIsUpdateStatusDialogOpen(true);
  };
  
  const handleOpenEditBookingDialog = (booking: Booking) => {
    setBookingForAction(booking);
    setEditedDate(parseISO(booking.date));
    setEditedTime(booking.time);
    setAdminNotes("");
    setIsEditBookingDialogOpen(true);
  };

  const handleConfirmStatusUpdate = async () => {
    if (!bookingForAction || !targetStatusForUpdate) return;
    if (targetStatusForUpdate === 'confirmed' && !resourceToAssign) {
      toast({ title: "Resource Required", description: "Please assign a resource to confirm the booking.", variant: "destructive" });
      return;
    }
  
    setIsUpdatingBooking(true);
    addClientLogEntry('Admin attempting to update booking status.', 'INFO', { bookingId: bookingForAction.id, newStatus: targetStatusForUpdate });
    
    const updates: Partial<Booking> & { adminNote?: string } = {
        status: targetStatusForUpdate,
        adminNote: adminNotes || undefined, // Send notes to the action
    };

    if (targetStatusForUpdate === 'confirmed') {
        updates.assignedResourceId = resourceToAssign;
    }

    const result = await updateBookingDetails(bookingForAction.id, updates);

    if (result.success && result.updatedBooking) {
      setAllBookings(prev => prev.map(b => b.id === bookingForAction.id ? result.updatedBooking! : b).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      toast({ title: "Booking Status Updated", description: `Booking #${String(bookingForAction.id).substring(0,8)} status changed to ${targetStatusForUpdate}.` });
      addClientLogEntry('Admin successfully updated booking status.', 'INFO', { bookingId: result.updatedBooking?.id, newStatus: result.updatedBooking?.status });
      setIsUpdateStatusDialogOpen(false);
      setBookingForAction(null);
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
      addClientLogEntry('Admin failed to update booking status.', 'ERROR', { bookingId: bookingForAction.id, newStatus: targetStatusForUpdate, error: result.message });
    }
    setIsUpdatingBooking(false);
  };

  const handleConfirmEditBooking = async () => {
    if (!bookingForAction || !editedDate || !editedTime) {
      toast({ title: "Missing Information", description: "Date and time are required.", variant: "destructive" });
      return;
    }
    setIsUpdatingBooking(true);
    const updates: Partial<Booking> & { adminNote?: string } = {
        date: format(editedDate, 'yyyy-MM-dd'),
        time: editedTime,
        adminNote: adminNotes || undefined
    };

    const result = await updateBookingDetails(bookingForAction.id, updates);
    if(result.success && result.updatedBooking) {
      toast({ title: "Booking Updated", description: "Booking details have been successfully changed." });
      setAllBookings(prev => prev.map(b => b.id === bookingForAction.id ? result.updatedBooking! : b).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      setIsEditBookingDialogOpen(false);
    } else {
      toast({ title: "Update Failed", description: result.message, variant: "destructive" });
    }
    setIsUpdatingBooking(false);
  };
  
  const handleConfirmDelete = async (bookingId: string) => {
    setIsDeletingBooking(true);
    const result = await deleteBooking(bookingId);
    if(result.success) {
        toast({ title: "Booking Deleted", description: result.message });
        setAllBookings(prev => prev.filter(b => b.id !== bookingId));
    } else {
        toast({ title: "Delete Failed", description: result.message, variant: "destructive" });
    }
    setIsDeletingBooking(false);
  };


  const filteredBookings = useMemo(() => {
    // Master date filter from settings
    const masterDateFrom = generalSettings.masterDateRangeFrom ? startOfDay(parseISO(generalSettings.masterDateRangeFrom)) : null;
    const masterDateTo = generalSettings.masterDateRangeTo ? endOfDay(parseISO(generalSettings.masterDateRangeTo)) : null;
    
    return allBookings.filter(booking => {
      const searchMatch = searchTerm.toLowerCase() === '' || booking.id.toLowerCase().includes(searchTerm.toLowerCase()) || booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || (booking.phone && booking.phone.includes(searchTerm)) || (booking.email && booking.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const statusMatch = filterValues.status === 'all' || booking.status === filterValues.status;
      const typeMatch = filterValues.bookingType === 'all' || (booking.bookingType || 'table') === filterValues.bookingType;
      
      let dateMatch = true;
      if (booking.date) {
        try {
          const bookingDateOnly = parseISO(booking.date);
          if (isValid(bookingDateOnly)) {
            // Check against master filter first
            if (masterDateFrom && masterDateTo) {
                dateMatch = isWithinInterval(bookingDateOnly, { start: masterDateFrom, end: masterDateTo });
            }
            // If master filter allows (or is not set), check against local filter
            if(dateMatch) {
              if (filterValues.dateRangeFrom && filterValues.dateRangeTo) {
                dateMatch = isWithinInterval(bookingDateOnly, { start: startOfDay(filterValues.dateRangeFrom), end: endOfDay(filterValues.dateRangeTo) });
              } else if (filterValues.dateRangeFrom) {
                dateMatch = bookingDateOnly >= startOfDay(filterValues.dateRangeFrom);
              } else if (filterValues.dateRangeTo) {
                dateMatch = bookingDateOnly <= endOfDay(filterValues.dateRangeTo);
              }
            }
          } else { dateMatch = !filterValues.dateRangeFrom && !filterValues.dateRangeTo && !masterDateFrom && !masterDateTo; }
        } catch (e) { dateMatch = !filterValues.dateRangeFrom && !filterValues.dateRangeTo && !masterDateFrom && !masterDateTo; }
      } else { dateMatch = !filterValues.dateRangeFrom && !filterValues.dateRangeTo && !masterDateFrom && !masterDateTo; }

      return searchMatch && statusMatch && typeMatch && dateMatch;
    }).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [allBookings, searchTerm, filterValues, generalSettings]);

  const getStatusBadge = (status: BookingStatus) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><ClockIcon className="mr-1 h-3 w-3"/>Pending</Badge>;
      case 'confirmed': return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-1 h-3 w-3"/>Confirmed</Badge>;
      case 'cancelled': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3"/>Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleFilterChange = (filterName: keyof typeof filterValues, value: string | Date | undefined) => {
    setFilterValues(prev => ({ ...prev, [filterName]: value }));
  };
  const clearFilters = () => { setFilterValues({ status: 'all', dateRangeFrom: undefined, dateRangeTo: undefined, bookingType: 'all' }); setSearchTerm(''); };
  
  const availableResourcesForAssignment = useMemo(() => {
    if (!bookingForAction) return { tables: [], rooms: [] };
    const availableTables = tables.filter(t => t.status === 'Available' || t.id === bookingForAction.assignedResourceId || t.id === bookingForAction.requestedResourceId);
    // Room availability check is conceptual for now
    const availableRooms = rooms.filter(r => r.capacity >= bookingForAction.partySize); 
    return { tables: availableTables, rooms: availableRooms };
  }, [tables, rooms, bookingForAction]);

  const suitableResourcesForQuickBooking = useMemo(() => {
    const partySize = quickBookingForm.watch("partySize");
    return {
      tables: tables.filter(table => table.status === 'Available' && table.capacity >= partySize),
      rooms: rooms.filter(room => room.capacity >= partySize)
    };
  }, [tables, rooms, quickBookingForm.watch("partySize")]);

  useEffect(() => { quickBookingForm.setValue('preOrderItems', quickBookingCart); }, [quickBookingCart, quickBookingForm]);
  
  const addItemToQuickBookingCart = (item: MenuItemType, portion: MenuItemPortion, quantity: number) => {
    setQuickBookingCart(prev => {
        const existingItemIndex = prev.findIndex(ci => ci.menuItemId === item.id && ci.selectedPortion === portion.name);
        if (existingItemIndex > -1) {
            const newCart = [...prev];
            newCart[existingItemIndex].quantity += quantity;
            return newCart;
        }
        return [...prev, { menuItemId: item.id, name: item.name, price: portion.price, quantity: quantity, selectedPortion: portion.name, note: "" }];
    });
    toast({ title: "Item Added", description: `${quantity} x ${item.name} added to booking pre-order.`});
  };

  const handleQuickAddItemToCart = () => {
    if (filteredMenuItemsForDialog.length === 1) {
        const item = filteredMenuItemsForDialog[0];
        const portions = parsePortionDetails(item.portionDetails);
        const defaultPortion = portions.find(p => p.isDefault) || portions[0];
        if (!defaultPortion) {
            toast({ title: "Item Error", description: `Item "${item.name}" has no defined portions/price. Cannot add.`, variant: "destructive"});
            return;
        }
        addItemToQuickBookingCart(item, defaultPortion, 1);
        setMenuSearchTermDialog('');
        return;
    }
    
    toast({ title: "Select Item", description: "Your search matches multiple items, or none. Please refine your search or select an item from the list to add.", variant: "destructive" });
  };
  
  const handleUpdateQuickCartQuantity = (itemId: string, portion: string | undefined, newQuantity: number) => { 
    setQuickBookingCart(prev => prev.map(item => (item.menuItemId === itemId && item.selectedPortion === portion) ? { ...item, quantity: newQuantity } : item).filter(item => item.quantity > 0)); 
  };
  const quickPreOrderTotalInBase = quickBookingCart.reduce((total, item) => total + item.price * item.quantity, 0);
  const displayQuickPreOrderTotal = convertPrice(quickPreOrderTotalInBase);

  const resetQuickCreateDialog = () => {
    quickBookingForm.reset({ 
        customerName: "Walk-in Guest", phone: "0000000000", email: "", partySize: 1, date: new Date(),
        bookingType: 'table', assignedResourceId: "", notes: "", preOrderItems: [],
    });
    setQuickBookingCart([]); clearPreOrderFiltersDialog();
  };

  async function onQuickBookingSubmit(values: QuickBookingFormValues) {
    setIsSavingQuickBooking(true);
    addClientLogEntry('Admin attempting to create quick booking.', 'INFO', { customerName: values.customerName, partySize: values.partySize, itemsCount: quickBookingCart.length, type: values.bookingType });
    const resourceList = values.bookingType === 'table' ? tables : rooms;
    const selectedResource = resourceList.find(r => r.id === values.assignedResourceId);
    if (!selectedResource) { quickBookingForm.setError("assignedResourceId", { message: "Selected resource not found."}); setIsSavingQuickBooking(false); return; }
    if (selectedResource.capacity < values.partySize) { quickBookingForm.setError("partySize", { message: `Party size exceeds selected resource capacity (${selectedResource.capacity}).`}); quickBookingForm.setError("assignedResourceId", { message: `Capacity: ${selectedResource.capacity}. Party: ${values.partySize}.`}); setIsSavingQuickBooking(false); return; }

    const newBooking: Booking = {
        id: `BKG-ADMIN-${crypto.randomUUID().substring(0,6).toUpperCase()}`,
        bookingType: values.bookingType,
        customerName: values.customerName, phone: values.phone || "", email: values.email || undefined,
        date: format(values.date, "yyyy-MM-dd"), time: values.time, partySize: values.partySize,
        assignedResourceId: values.assignedResourceId, status: 'confirmed', 
        items: quickBookingCart, notes: values.notes,
    };
    const result = await saveNewBooking(newBooking);
    if (result.success && result.bookingId) {
        toast({ title: "Booking Created", description: `Booking #${String(result.bookingId).substring(0,8)} created and confirmed.` });
        addClientLogEntry('Admin successfully created quick booking.', 'INFO', { bookingId: result.bookingId });
        setAllBookings(prev => [newBooking, ...prev].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
        if (newBooking.email) { await sendBookingConfirmationEmail(newBooking, displayCurrencyCode, currencySymbol); }
        setIsQuickCreateDialogOpen(false);
        resetQuickCreateDialog();
    } else {
        toast({ title: "Error Creating Booking", description: result.message, variant: "destructive" });
        addClientLogEntry('Admin failed to create quick booking.', 'ERROR', { customerName: values.customerName, error: result.message });
    }
    setIsSavingQuickBooking(false);
  }

  const bookingTypeForQuickCreate = quickBookingForm.watch("bookingType");

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
        <div><h1 className="text-3xl font-headline font-bold text-primary">Manage Bookings</h1><p className="text-muted-foreground">Oversee all customer table and room reservations.</p></div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => { resetQuickCreateDialog(); setIsQuickCreateDialogOpen(true);}} variant="default" className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4"/> Quick Create Booking</Button>
            <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/50 w-full sm:w-auto">
                <Timer className="h-5 w-5 text-muted-foreground" /><Label htmlFor="autoRefreshBookings" className="text-sm font-medium whitespace-nowrap">Auto-Refresh:</Label>
                <Switch id="autoRefreshBookings" checked={autoRefreshBookingsEnabled} onCheckedChange={setAutoRefreshBookingsEnabled} aria-label="Toggle auto refresh bookings" />
                {autoRefreshBookingsEnabled && ( <Select value={String(bookingsRefreshIntervalSeconds)} onValueChange={(value) => setBookingsRefreshIntervalSeconds(Number(value))}> <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="30">30s</SelectItem> <SelectItem value="60">60s</SelectItem> <SelectItem value="120">2m</SelectItem> <SelectItem value="300">5m</SelectItem> </SelectContent> </Select> )}
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading} className="w-full sm:w-auto"><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin': ''}`} /> Refresh Now</Button>
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div><CardTitle className="font-headline">Booking List ({allBookings.length})</CardTitle><CardDescription>Filter and manage customer bookings.</CardDescription></div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <Input placeholder="Search by ID, Name, Phone, Email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:w-52"/>
                <Popover>
                    <PopoverTrigger asChild><Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4"/> Filters</Button></PopoverTrigger>
                    <PopoverContent className="w-96 z-50" align="end">
                        <div className="grid gap-4"><div className="space-y-2"><h4 className="font-medium leading-none">Filter Options</h4></div><div className="grid gap-3">
                            <div className="grid grid-cols-3 items-center gap-4"><Label htmlFor="filterStatus">Status</Label><Select value={filterValues.status} onValueChange={(value) => handleFilterChange('status', value)}><SelectTrigger id="filterStatus" className="col-span-2 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{ALL_BOOKING_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
                            <div className="grid grid-cols-3 items-center gap-4"><Label htmlFor="filterBookingType">Type</Label><Select value={filterValues.bookingType} onValueChange={(value) => handleFilterChange('bookingType', value)}><SelectTrigger id="filterBookingType" className="col-span-2 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="table">Table</SelectItem><SelectItem value="room">Room</SelectItem></SelectContent></Select></div>
                            <div className="grid grid-cols-1 gap-2"><Label>Booking Date Range</Label><div className="grid grid-cols-2 gap-2">
                                <Popover><PopoverTrigger asChild><Button variant={"outline"} className={`h-8 justify-start text-left font-normal ${!filterValues.dateRangeFrom && "text-muted-foreground"}`}><CalendarDays className="mr-2 h-4 w-4" />{filterValues.dateRangeFrom ? format(filterValues.dateRangeFrom, "MMM d, yyyy") : <span>From Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterValues.dateRangeFrom} onSelect={(d) => handleFilterChange('dateRangeFrom', d)} initialFocus /></PopoverContent></Popover>
                                <Popover><PopoverTrigger asChild><Button variant={"outline"} className={`h-8 justify-start text-left font-normal ${!filterValues.dateRangeTo && "text-muted-foreground"}`}><CalendarDays className="mr-2 h-4 w-4" />{filterValues.dateRangeTo ? format(filterValues.dateRangeTo, "MMM d, yyyy") : <span>To Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterValues.dateRangeTo} onSelect={(d) => handleFilterChange('dateRangeTo', d)} disabled={(date) => filterValues.dateRangeFrom ? date < filterValues.dateRangeFrom : false} initialFocus /></PopoverContent></Popover>
                            </div></div></div><Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button></div>
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? ( <div className="flex justify-center items-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-muted-foreground">Loading bookings...</p></div>
          ) : filteredBookings.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-20rem)]"><Table><TableHeaderComponent><TableRow>
                <TableHead>ID / Date</TableHead><TableHead>Customer / Contact</TableHead><TableHead>Details</TableHead>
                <TableHead>Resource Info</TableHead><TableHead>Pre-Order</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeaderComponent><TableBody>
              {filteredBookings.map(booking => {
                const bookingType = booking.bookingType || 'table';
                const resourceList = bookingType === 'table' ? tables : rooms;
                const requestedResource = resourceList.find(r => r.id === booking.requestedResourceId);
                const assignedResource = resourceList.find(r => r.id === booking.assignedResourceId);
                return ( <TableRow key={booking.id}>
                    <TableCell><div className="font-medium text-primary">#{String(booking.id).substring(0,8)}...</div><div className="text-xs text-muted-foreground">{format(parseISO(booking.date), "MMM d, yyyy")} @ {booking.time}</div></TableCell>
                    <TableCell><div>{booking.customerName}</div><div className="text-xs text-muted-foreground">{booking.phone}</div>{booking.email && <div className="text-xs text-muted-foreground truncate max-w-[150px]">{booking.email}</div>}</TableCell>
                    <TableCell><div className="flex items-center"><Users className="mr-1 h-3 w-3"/>Party: {booking.partySize}</div>{booking.notes && <div className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]" title={booking.notes}><MessageSquare className="inline-block h-3 w-3 mr-1"/>Notes: {booking.notes}</div>}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{bookingType}</Badge>
                        {assignedResource ? <Badge variant="default">{assignedResource.name}</Badge> : requestedResource ? <Badge variant="outline" title={`Requested: ${requestedResource.name}`}>Req: {requestedResource.name.substring(0,10)}...</Badge> : <Badge variant="secondary">None</Badge>}
                    </div></TableCell>
                    <TableCell>{Array.isArray(booking.items) && booking.items.length > 0 ? <Badge variant="outline">{booking.items.reduce((sum, item) => sum + item.quantity, 0)} items</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenEditBookingDialog(booking)} disabled={isUpdatingBooking}><SquarePen className="mr-2 h-4 w-4"/> Edit Date/Time</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {booking.status === 'pending' && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'confirmed')} disabled={isUpdatingBooking}><CheckCircle className="mr-2 h-4 w-4"/> Confirm & Assign</DropdownMenuItem>}
                        {booking.status === 'confirmed' && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'confirmed')} disabled={isUpdatingBooking}><SquarePen className="mr-2 h-4 w-4"/> Change Resource</DropdownMenuItem>}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'cancelled')} className="text-destructive focus:text-destructive" disabled={isUpdatingBooking}><XCircle className="mr-2 h-4 w-4"/> Cancel Booking</DropdownMenuItem>}
                        {booking.status === 'cancelled' && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'pending')} disabled={isUpdatingBooking}><ClockIcon className="mr-2 h-4 w-4"/> Reopen (Set to Pending)</DropdownMenuItem>}
                        {user?.role === 'superadmin' && (<>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/> Delete Permanently</DropdownMenuItem></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeaderComponent><AlertDialogTitleComponent>Delete Booking Permanently?</AlertDialogTitleComponent>
                                  <AlertDialogDescription>This action cannot be undone and will permanently delete the booking record #{String(booking.id).substring(0,8)}.</AlertDialogDescription>
                                </AlertDialogHeaderComponent>
                                <AlertDialogFooterComponent><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleConfirmDelete(booking.id)} disabled={isDeletingBooking}>Confirm Delete</AlertDialogAction></AlertDialogFooterComponent>
                              </AlertDialogContent>
                            </AlertDialog>
                        </>)}
                    </DropdownMenuContent></DropdownMenu></TableCell>
                </TableRow>
              )})}
            </TableBody></Table></ScrollArea>
          ) : ( <div className="text-center py-16"><PackageSearch className="h-20 w-20 text-muted-foreground mx-auto mb-6" /><h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Bookings Found</h2><p className="text-muted-foreground">{searchTerm || Object.values(filterValues).some(v => v !== 'all' && v !== undefined) ? "No bookings match your current search/filter criteria." : "There are no bookings in the system yet."}</p></div> )}
        </CardContent>
      </Card>
      
       <Dialog open={isUpdateStatusDialogOpen} onOpenChange={setIsUpdateStatusDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">{targetStatusForUpdate} Booking #{bookingForAction?.id.substring(0,8)}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p>Customer: {bookingForAction?.customerName} | Party Size: {bookingForAction?.partySize} | Type: <span className="capitalize font-semibold">{bookingForAction?.bookingType}</span></p>
            <p>Date: {bookingForAction?.date ? format(parseISO(bookingForAction.date), 'MMM d, yyyy') : 'N/A'} at {bookingForAction?.time}</p>
            {targetStatusForUpdate === 'confirmed' && (
              <div><Label htmlFor="resourceAssignSelect">Assign {bookingForAction?.bookingType}</Label><Select value={resourceToAssign || ''} onValueChange={setResourceToAssign}><SelectTrigger id="resourceAssignSelect"><SelectValue placeholder={`Choose a ${bookingForAction?.bookingType}`} /></SelectTrigger><SelectContent>{bookingForAction?.bookingType === 'table' ? availableResourcesForAssignment.tables.map(table => ( <SelectItem key={table.id} value={table.id} disabled={table.status !== 'Available' && table.id !== bookingForAction?.assignedResourceId && table.id !== bookingForAction?.requestedResourceId}>{table.name} (Capacity: {table.capacity}) {table.status !== 'Available' && `(${table.status})`}</SelectItem> )) : availableResourcesForAssignment.rooms.map(room => ( <SelectItem key={room.id} value={room.id}>{room.name} (Capacity: {room.capacity})</SelectItem> ))}{bookingForAction?.bookingType === 'table' && availableResourcesForAssignment.tables.length === 0 && <SelectItem value="no-resources" disabled>No suitable tables</SelectItem>}{bookingForAction?.bookingType === 'room' && availableResourcesForAssignment.rooms.length === 0 && <SelectItem value="no-resources" disabled>No suitable rooms</SelectItem>}</SelectContent></Select><p className="text-xs text-muted-foreground mt-1">Only available or already associated resources are shown.</p></div>
            )}
            <div><Label htmlFor="adminNotesStatus">Notes for Customer (Optional)</Label><Textarea id="adminNotesStatus" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder={targetStatusForUpdate === 'cancelled' ? 'Reason for cancellation...' : 'e.g., Special arrangements have been made.'}/><p className="text-xs text-muted-foreground mt-1">These notes will be included in the notification email to the customer and added to the booking history.</p></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleConfirmStatusUpdate} disabled={isUpdatingBooking}>{isUpdatingBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Confirm Status Change</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isEditBookingDialogOpen} onOpenChange={setIsEditBookingDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Edit Booking #{bookingForAction?.id.substring(0,8)}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <p>Customer: <strong>{bookingForAction?.customerName}</strong></p>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>New Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={`w-full justify-start text-left font-normal`}><CalendarDays className="mr-2 h-4 w-4" />{editedDate ? format(editedDate, "PPP") : <span>Pick date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editedDate} onSelect={setEditedDate} disabled={(d) => d < startOfDay(new Date())} initialFocus /></PopoverContent></Popover></div>
                    <div className="space-y-1"><Label>New Time</Label><Select value={editedTime} onValueChange={setEditedTime}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div><Label htmlFor="adminNotesEdit">Notes for Customer (Optional)</Label><Textarea id="adminNotesEdit" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Reason for the change..."/><p className="text-xs text-muted-foreground mt-1">These notes will be included in the notification email.</p></div>
            </div>
            <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleConfirmEditBooking} disabled={isUpdatingBooking}>{isUpdatingBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Changes & Notify</Button></DialogFooter>
        </DialogContent>
       </Dialog>
       
      <Dialog open={isQuickCreateDialogOpen} onOpenChange={(open) => { if(!open) resetQuickCreateDialog(); setIsQuickCreateDialogOpen(open); }}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle className="font-headline text-2xl text-primary">Quick Create New Booking</DialogTitle></DialogHeader><Form {...quickBookingForm}>
        <form onSubmit={quickBookingForm.handleSubmit(onQuickBookingSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={quickBookingForm.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Customer Name *</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage /></FormItem>)}/> <FormField control={quickBookingForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/></div>
            <FormField control={quickBookingForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (for confirmation)</FormLabel><FormControl><Input type="email" {...field} placeholder="Optional"/></FormControl><FormMessage /></FormItem>)}/>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><FormField control={quickBookingForm.control} name="partySize" render={({ field }) => (<FormItem><FormLabel>Party Size *</FormLabel><FormControl><Input type="number" {...field} min="1"/></FormControl><FormMessage /></FormItem>)}/> <FormField control={quickBookingForm.control} name="date" render={({ field }) => (<FormItem className="flex flex-col pt-2"><FormLabel>Date *</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={`justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}><CalendarDays className="mr-2 h-4 w-4"/>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(d) => d < startOfDay(new Date())}/></PopoverContent></Popover><FormMessage/></FormItem>)}/> <FormField control={quickBookingForm.control} name="time" render={({ field }) => (<FormItem className="pt-2"><FormLabel>Time *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{availableTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/></div>
            <FormField control={quickBookingForm.control} name="bookingType" render={({ field }) => (<FormItem><FormLabel>Booking Type *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="table">Table</SelectItem><SelectItem value="room">Room</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
            <FormField control={quickBookingForm.control} name="assignedResourceId" render={({ field }) => (<FormItem><FormLabel>Assign {bookingTypeForQuickCreate} *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger>
                <SelectValue placeholder={suitableResourcesForQuickBooking[bookingTypeForQuickCreate === 'table' ? 'tables' : 'rooms'].length > 0 ? `Select an available ${bookingTypeForQuickCreate}` : `No 'Available' ${bookingTypeForQuickCreate}s found`}/>
            </SelectTrigger></FormControl><SelectContent>
                {bookingTypeForQuickCreate === 'table' ? suitableResourcesForQuickBooking.tables.map(t => <SelectItem key={t.id} value={t.id}>{t.name} (Cap: {t.capacity})</SelectItem>) : suitableResourcesForQuickBooking.rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</SelectItem>)}
                {suitableResourcesForQuickBooking[bookingTypeForQuickCreate === 'table' ? 'tables' : 'rooms'].length === 0 && <SelectItem value="no-suitable-resource-placeholder" disabled>No 'Available' resources found</SelectItem>}
            </SelectContent></Select><FormMessage/></FormItem>)}/>
            <Card className="pt-3"><CardHeader className="p-2 pb-1"><CardTitle className="text-base font-semibold flex items-center"><Utensils className="mr-2 h-4 w-4 text-accent"/>Pre-order Items (Optional)</CardTitle></CardHeader><CardContent className="p-2 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                    <div className="relative w-full sm:flex-grow"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Search or Enter Item ID..." value={menuSearchTermDialog} onChange={(e) => setMenuSearchTermDialog(e.target.value)} className="pl-8 h-9 text-sm"/></div>
                    <Button type="button" variant="outline" size="sm" onClick={handleQuickAddItemToCart} className="h-9"><PlusCircle className="mr-1 h-4 w-4"/>Add</Button>
                </div>
                {quickBookingCart.length > 0 && (<ScrollArea className="max-h-32 border rounded-md p-2 mt-2"><div className="space-y-1.5">
                {quickBookingCart.map((item, index) => { const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" ? `${item.name} (${item.selectedPortion})` : item.name; return ( <div key={`${item.menuItemId}-${item.selectedPortion || 'fixed'}-${index}`} className="flex items-start justify-between text-xs gap-2"><div className="flex-grow space-y-1"><span className="font-medium block">{itemDisplayName}</span><Input type="text" placeholder="Item specific note (e.g. no onion)" value={item.note || ""} onChange={(e) => { const newCart = [...quickBookingCart]; newCart[index].note = e.target.value; setQuickBookingCart(newCart);}} className="h-7 text-xs w-full"/></div><div className="flex items-center gap-1 shrink-0"><Input type="number" value={item.quantity} onChange={e => handleUpdateQuickCartQuantity(item.menuItemId, item.selectedPortion, Number(e.target.value))} className="w-12 h-6 text-xs text-center" min="1"/><Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleUpdateQuickCartQuantity(item.menuItemId, item.selectedPortion, 0)}><Trash2 className="h-3 w-3"/></Button></div></div>)})}</div></ScrollArea>)}
                {quickBookingCart.length > 0 && <div className="text-right text-sm font-semibold mt-1">Pre-order Total: {currencySymbol}{displayQuickPreOrderTotal.toFixed(2)}</div>}
            </CardContent></Card>
            <FormField control={quickBookingForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional notes for this booking..." {...field} rows={2}/></FormControl><FormMessage/></FormItem>)}/>
            <DialogFooter className="pt-4"><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={isSavingQuickBooking}>{isSavingQuickBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Create & Confirm Booking</Button></DialogFooter>
        </form>
      </Form></DialogContent></Dialog>
    </div>
  );
}
