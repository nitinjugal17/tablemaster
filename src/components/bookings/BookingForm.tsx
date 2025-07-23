
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, Users, Clock, Search, ShoppingCart, Utensils, PlusCircle, MinusCircle, Trash2, Mail, PackagePlus, Loader2, Columns3, MessageSquare, StickyNote, SlidersHorizontal, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, useMemo } from "react";
import type { MenuItem as MenuItemType, OrderItem, Booking, RestaurantTable, MenuItemPortion } from "@/lib/types";
import { getMenuItems, getRestaurantTables } from "@/app/actions/data-management-actions";
import { addClientLogEntry } from "@/app/actions/logging-actions";
import { saveNewBooking } from "@/app/actions/booking-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/hooks/useCurrency';
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import { parseISO as dateFnsParseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { parsePortionDetails } from '@/lib/utils';

const orderItemSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required."),
  name: z.string().min(1, "Item name is required."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  selectedPortion: z.string().optional(),
  note: z.string().optional(), 
});

export const bookingFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  date: z.date({ required_error: "A date for booking is required." }),
  time: z.string({ required_error: "A time for booking is required." }),
  partySize: z.coerce.number().min(1, { message: "Party size must be at least 1." }).max(50, { message: "For very large parties, please call us." }),
  selectedItems: z.array(orderItemSchema).optional(),
  requestedResourceId: z.string().optional(),
  notes: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

const availableTimes = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];
const PENDING_BOOKING_DETAILS_KEY = 'pending_booking_details';

export function BookingForm() {
  const { toast } = useToast();
  const { currencySymbol, convertPrice, currencyCode: displayCurrencyCode } = useCurrency();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter(); 
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [availableTables, setAvailableTables] = useState<RestaurantTable[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [bookingCart, setBookingCart] = useState<OrderItem[]>([]);
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [menuActiveCategory, setMenuActiveCategory] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [preOrderFilterCuisine, setPreOrderFilterCuisine] = useState<string>('all');
  const [preOrderFilterDietary, setPreOrderFilterDietary] = useState<string>('all');

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      partySize: 2,
      selectedItems: [],
      requestedResourceId: "",
      notes: "",
    },
  });
  
  useEffect(() => {
    if (isAuthenticated && user) {
        form.setValue('name', user.name || "");
        form.setValue('email', user.email || "");
        form.setValue('phone', user.phone || "");
    }
  }, [isAuthenticated, user, form]);


  useEffect(() => {
    async function fetchData() {
      setIsLoadingMenu(true);
      setIsLoadingTables(true);
      try {
        const [items, tables] = await Promise.all([
          getMenuItems(),
          getRestaurantTables()
        ]);
        setMenuItems(items);
        setAvailableTables(tables.filter(t => t.status === 'Available'));
      } catch (error) {
        toast({ title: "Error", description: "Could not load menu items or table information.", variant: "destructive" });
      } finally {
        setIsLoadingMenu(false);
        setIsLoadingTables(false);
      }
    }
    fetchData();
  }, [toast]);

  const menuCategories = useMemo(() => ['All', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean).sort()))], [menuItems]);
  const uniqueCuisines = useMemo(() => ['all', ...Array.from(new Set(menuItems.map(item => item.cuisine).filter((c): c is string => !!c).sort()))], [menuItems]);
  const uniqueDietaryOptions = useMemo(() => ['all', ...Array.from(new Set(menuItems.map(item => item.dietaryRestrictions).filter((d): d is string => !!d).sort()))], [menuItems]);


  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const lowerSearchTerm = menuSearchTerm.toLowerCase();
      const matchesCategory = menuActiveCategory === 'All' || item.category === menuActiveCategory;
      
      const searchFields = [
        item.name.toLowerCase(),
        String(item.id).toLowerCase(),
        item.category.toLowerCase(),
        item.cuisine?.toLowerCase() || '',
        item.ingredients?.toLowerCase() || '',
        item.synonyms?.toLowerCase() || '',
        item.description?.toLowerCase() || '',
      ];
      const matchesSearch = lowerSearchTerm === '' || searchFields.some(field => field.includes(lowerSearchTerm));

      const matchesCuisine = preOrderFilterCuisine === 'all' || item.cuisine === preOrderFilterCuisine;
      const matchesDietary = preOrderFilterDietary === 'all' || item.dietaryRestrictions === preOrderFilterDietary;
      
      return matchesCategory && matchesSearch && item.isAvailable && matchesCuisine && matchesDietary;
    });
  }, [menuItems, menuSearchTerm, menuActiveCategory, preOrderFilterCuisine, preOrderFilterDietary]);
  
  const clearPreOrderFilters = () => {
    setMenuSearchTerm('');
    setMenuActiveCategory('All');
    setPreOrderFilterCuisine('all');
    setPreOrderFilterDietary('all');
  };

  const handleAddPreOrderItemToCart = (item: MenuItemType, selectedPortion: { name: string; price: number }) => {
    addClientLogEntry('User added item to booking pre-order cart.', 'INFO', { itemId: item.id, itemName: item.name, portion: selectedPortion.name, price: selectedPortion.price });
    setBookingCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(cartItem => 
        cartItem.menuItemId === item.id && 
        cartItem.selectedPortion === selectedPortion.name &&
        (cartItem.note || "") === "" 
      );
      if (existingItemIndex > -1) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex].quantity += 1;
        return updatedCart;
      }
      return [...prevCart, { 
        menuItemId: item.id, 
        name: item.name, 
        price: selectedPortion.price, 
        quantity: 1, 
        selectedPortion: selectedPortion.name,
        note: '' 
      }];
    });
  };

  const handleUpdateQuantity = (itemId: string, portion: string | undefined, note: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      setBookingCart(prevCart => prevCart.filter(item => !(item.menuItemId === itemId && item.selectedPortion === portion && item.note === note)));
    } else {
      setBookingCart(prevCart =>
        prevCart.map(item => (item.menuItemId === itemId && item.selectedPortion === portion && item.note === note ? { ...item, quantity } : item))
      );
    }
  };
  
  const handleUpdateItemNote = (itemId: string, portion: string | undefined, oldNote: string | undefined, newNote: string) => {
    setBookingCart(prevCart =>
      prevCart.map(item => (item.menuItemId === itemId && item.selectedPortion === portion && item.note === oldNote ? { ...item, note: newNote } : item))
    );
  };

  useEffect(() => {
    form.setValue('selectedItems', bookingCart);
  }, [bookingCart, form]);
  
  const preOrderTotalInBase = bookingCart.reduce((total, item) => total + item.price * item.quantity, 0);
  const displayPreOrderTotal = convertPrice(preOrderTotalInBase);


  async function onSubmit(values: BookingFormValues) {
    if (!isAuthenticated) {
      localStorage.setItem(PENDING_BOOKING_DETAILS_KEY, JSON.stringify(values));
      toast({
        title: "Please Log In or Sign Up",
        description: "You need to be logged in to complete your booking. Your booking details have been saved.",
        duration: 5000,
      });
      router.push(`/login?postLoginRedirectPath=/bookings&postLoginAction=complete_booking`);
      return;
    }

    setIsSubmitting(true);
    addClientLogEntry('User attempting to submit new booking request.', 'INFO', { customerName: values.name, partySize: values.partySize, date: values.date, time: values.time, itemCount: values.selectedItems?.length || 0, userId: user?.id });
    const bookingId = `BKG-${crypto.randomUUID().substring(0,8).toUpperCase()}`;

    const bookingDataToSave: Booking = {
      id: bookingId,
      userId: user?.id, 
      customerName: values.name,
      phone: values.phone,
      email: values.email || undefined,
      date: format(values.date, "yyyy-MM-dd"),
      time: values.time,
      partySize: values.partySize,
      items: values.selectedItems, 
      status: 'pending', 
      bookingType: 'table', // Public form is for tables
      requestedResourceId: values.requestedResourceId || undefined,
      assignedResourceId: undefined, 
      notes: values.notes || undefined,
      createdAt: new Date().toISOString()
    };

    try {
      const result = await saveNewBooking(bookingDataToSave);

      if (result.success && result.bookingId) {
        let description = `Your booking (#${String(result.bookingId).substring(0,8)}) for ${format(values.date, "PPP")} at ${values.time} has been received and is pending confirmation.`;
        if (values.email) {
            description += result.customerEmailStatus.sent 
                ? ` A summary was emailed to ${values.email}.`
                : ` Failed to send confirmation email: ${result.customerEmailStatus.error || 'Unknown reason'}.`;
        }
        if (result.customerEmailStatus.messageId === 'mock_message_id' && values.email) {
            description += ' (Customer email mocked)';
        }
        if (result.adminEmailStatus.messageId === 'mock_message_id') {
            description += ' (Admin email mocked)';
        }

        toast({
          title: "Booking Request Sent!",
          description: description,
          duration: 7000,
        });
        addClientLogEntry('Booking request submitted successfully.', 'INFO', { bookingId: result.bookingId, customerEmailStatus: result.customerEmailStatus, adminEmailStatus: result.adminEmailStatus });
        
        form.reset({
            name: (isAuthenticated && user?.name) ? user.name : "",
            email: (isAuthenticated && user?.email) ? user.email : "",
            phone: (isAuthenticated && user?.phone) ? user.phone : "",
            partySize: 2,
            selectedItems: [],
            requestedResourceId: "",
            notes: "",
        });
        setBookingCart([]);
      } else {
        toast({
          title: "Booking Failed",
          description: result.message || "Could not save your booking request.",
          variant: "destructive",
        });
        addClientLogEntry('Booking request submission failed.', 'ERROR', { error: result.message });
      }
    } catch (error) {
      console.error("Error during booking submission process:", error);
      toast({
        title: "Booking Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      addClientLogEntry('Booking submission process threw an error.', 'ERROR', { error: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const partySizeValue = form.watch("partySize");
  const suitableTables = useMemo(() => {
    return availableTables.filter(table => table.capacity >= partySizeValue && table.status === 'Available');
  }, [availableTables, partySizeValue]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="(123) 456-7890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

         <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address (Optional)</FormLabel>
                <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                </div>
                <FormDescription>Receive booking confirmation and updates.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0,0,0,0)) 
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time * <Clock className="inline h-4 w-4 ml-1" /></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableTimes.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="partySize"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Party Size * <Users className="inline h-4 w-4 ml-1" /></FormLabel>
                    <FormControl>
                        <Input type="number" min="1" max="50" placeholder="Number of guests" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="requestedResourceId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Preferred Table (Optional) <Columns3 className="inline h-4 w-4 ml-1" /></FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingTables || suitableTables.length === 0}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={isLoadingTables ? "Loading tables..." : (suitableTables.length === 0 ? "No tables for this party size" : "Select an available table")} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {isLoadingTables && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                            {!isLoadingTables && suitableTables.length === 0 && <SelectItem value="no-tables" disabled>No suitable tables available</SelectItem>}
                            {!isLoadingTables && suitableTables.map(table => (
                            <SelectItem key={table.id} value={table.id}>
                                {table.name} (Capacity: {table.capacity})
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormDescription>Table availability based on current status and capacity.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Special Requests/Notes (Optional) <MessageSquare className="inline h-4 w-4 ml-1" /></FormLabel>
                    <FormControl>
                        <Textarea placeholder="e.g., Anniversary celebration, dietary restrictions not listed, window seat preference..." {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        <Card className="mt-6 shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center"><PackagePlus className="mr-2 h-5 w-5 text-accent"/>Pre-order Items (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-3 items-center mb-4">
                <div className="relative w-full sm:flex-grow">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search menu by name, ID, ingredients..." 
                        value={menuSearchTerm}
                        onChange={e => setMenuSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0"><SlidersHorizontal className="h-4 w-4"/></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 z-50" align="end">
                        <div className="grid gap-4">
                            <div className="space-y-2"><h4 className="font-medium leading-none text-sm">More Filters</h4></div>
                            <div className="grid gap-3">
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="preOrderFilterCuisineBooking" className="text-xs">Cuisine</Label>
                                    <Select value={preOrderFilterCuisine} onValueChange={setPreOrderFilterCuisine}>
                                        <SelectTrigger id="preOrderFilterCuisineBooking" className="col-span-2 h-8 text-xs">
                                            <SelectValue placeholder="Cuisine" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {uniqueCuisines.map(c => <SelectItem key={c} value={c} className="capitalize text-xs">{c === 'all' ? 'All' : c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="preOrderFilterDietaryBooking" className="text-xs">Dietary</Label>
                                    <Select value={preOrderFilterDietary} onValueChange={setPreOrderFilterDietary}>
                                        <SelectTrigger id="preOrderFilterDietaryBooking" className="col-span-2 h-8 text-xs">
                                            <SelectValue placeholder="Dietary" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {uniqueDietaryOptions.map(opt => <SelectItem key={opt} value={opt} className="capitalize text-xs">{opt === 'all' ? 'All' : opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button onClick={clearPreOrderFilters} variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground hover:text-primary">Clear Item Filters</Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            
            <div className="space-y-2">
                <FormLabel>Filter by Category</FormLabel>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <RadioGroup
                        value={menuActiveCategory}
                        onValueChange={setMenuActiveCategory}
                        className="flex space-x-2 p-2"
                    >
                        {menuCategories.map(cat => (
                        <div key={cat} className="flex items-center space-x-1">
                            <RadioGroupItem value={cat} id={`cat-${cat}-booking`} className="sr-only" />
                            <Label 
                                htmlFor={`cat-${cat}-booking`}
                                className={cn(
                                    "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                    menuActiveCategory === cat 
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                        : "bg-background hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                {cat}
                            </Label>
                        </div>
                        ))}
                    </RadioGroup>
                    <div className="h-1" /> 
                </ScrollArea>
            </div>


            {isLoadingMenu ? (
                <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /> <p className="text-muted-foreground text-sm">Loading menu...</p></div>
            ) : filteredMenuItems.length > 0 ? (
                <ScrollArea className="h-[250px] border rounded-md p-3">
                    <div className="space-y-3">
                    {filteredMenuItems.map(item => {
                        const parsedPortions = parsePortionDetails(item.portionDetails);
                        const defaultPortion = parsedPortions.find((p: MenuItemPortion) => p.isDefault) || parsedPortions[0] || {name: "fixed", price: 0};
                        const hasMultiplePortions = parsedPortions && parsedPortions.length > 1;
                        return (
                        <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50">
                            <div className="flex items-center gap-2 flex-grow">
                                <Image src={item.imageUrl} alt={item.name} width={40} height={40} className="rounded object-cover aspect-square" data-ai-hint={item.aiHint || item.name.toLowerCase()}/>
                                <div>
                                    <p className="text-sm font-medium leading-tight">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{currencySymbol}{convertPrice(defaultPortion.price).toFixed(2)}{hasMultiplePortions ? " (default)" : ""}</p>
                                </div>
                            </div>
                            {hasMultiplePortions ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button type="button" size="sm" variant="outline" className="shrink-0">
                                            <PlusCircle className="h-4 w-4 mr-1.5"/> Add <ChevronDown className="ml-1 h-3 w-3"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {parsedPortions.map(portion => (
                                            <DropdownMenuItem key={portion.name} onClick={() => handleAddPreOrderItemToCart(item, portion)} className="capitalize text-xs">
                                                Add {portion.name} ({currencySymbol}{convertPrice(portion.price).toFixed(2)})
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <Button type="button" size="sm" variant="outline" onClick={() => handleAddPreOrderItemToCart(item, defaultPortion)} className="shrink-0">
                                    <PlusCircle className="h-4 w-4 mr-1.5"/> Add
                                </Button>
                            )}
                        </div>
                    )})}
                    </div>
                </ScrollArea>
            ) : (
                <p className="text-center text-muted-foreground py-4">No items match your search/filter.</p>
            )}
            
            {bookingCart.length > 0 && (
                <div className="mt-4 space-y-3">
                    <h4 className="font-semibold">Your Pre-order:</h4>
                     <ScrollArea className="h-[200px] border rounded-md p-3 space-y-3">
                        {bookingCart.map(cartItem => {
                             const itemDisplayName = cartItem.selectedPortion && cartItem.selectedPortion !== "fixed" 
                                            ? `${cartItem.name} (${cartItem.selectedPortion})` 
                                            : cartItem.name;
                            return (
                            <div key={`${cartItem.menuItemId}-${cartItem.selectedPortion || 'fixed'}-${cartItem.note || 'no-note'}`} className="p-2.5 rounded-md bg-background border space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-medium">{itemDisplayName}</p>
                                        <p className="text-xs text-muted-foreground">{currencySymbol}{convertPrice(cartItem.price * cartItem.quantity).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateQuantity(cartItem.menuItemId, cartItem.selectedPortion, cartItem.note, cartItem.quantity - 1)}>
                                            <MinusCircle className="h-3.5 w-3.5"/>
                                        </Button>
                                        <span className="text-sm w-5 text-center">{cartItem.quantity}</span>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateQuantity(cartItem.menuItemId, cartItem.selectedPortion, cartItem.note, cartItem.quantity + 1)}>
                                            <PlusCircle className="h-3.5 w-3.5"/>
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleUpdateQuantity(cartItem.menuItemId, cartItem.selectedPortion, cartItem.note, 0)}>
                                            <Trash2 className="h-3.5 w-3.5"/>
                                        </Button>
                                    </div>
                                </div>
                                 <div className="flex items-center gap-1.5">
                                     <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                     <Input
                                        type="text"
                                        placeholder="Item note (e.g., extra spicy)"
                                        value={cartItem.note || ''}
                                        onChange={(e) => handleUpdateItemNote(cartItem.menuItemId, cartItem.selectedPortion, cartItem.note, e.target.value)}
                                        className="h-7 text-xs flex-grow"
                                        />
                                 </div>
                            </div>
                        )})}
                    </ScrollArea>
                    <div className="text-right font-semibold">
                        Pre-order Total: {currencySymbol}{displayPreOrderTotal.toFixed(2)}
                    </div>
                </div>
            )}
             <FormField
                control={form.control}
                name="selectedItems"
                render={() => <FormMessage />} 
            />
          </CardContent>
        </Card>


        <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
          {isSubmitting ? "Submitting Request..." : (isAuthenticated ? "Request Booking" : "Login/Sign Up to Book")}
        </Button>
      </form>
    </Form>
  );
}

    