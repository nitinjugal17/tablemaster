
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, OrderItem, MenuItem as MenuItemType, RestaurantTable, Room, Booking, MenuItemPortion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from '@/hooks/useCurrency';
import { saveNewBooking } from '@/app/actions/booking-actions';
import { placeNewWalkInOrder, placeInRoomOrder } from '@/app/actions/order-actions';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Loader2, Utensils, PlusCircle, Trash2, Search, SlidersHorizontal, ChevronDown, BedDouble, Columns3, StickyNote } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, parseISO, isWithinInterval, endOfDay, isValid } from 'date-fns';
import { cn } from "@/lib/utils";
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext';
import { parsePortionDetails } from '@/lib/utils';


const entryFormSchema = z.object({
  entryType: z.enum(['pos', 'booking']),
  customerName: z.string().min(1, "Customer name is required."),
  
  // POS Specific
  orderType: z.enum(['Dine-in', 'Takeaway', 'In-Room Dining']).optional(),
  tableNumber: z.string().optional(),
  bookingId: z.string().optional(),
  outletId: z.string().optional(),

  // Booking Specific
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  partySize: z.coerce.number().min(1).optional(),
  date: z.date().optional(),
  time: z.string().optional(),
  requestedResourceId: z.string().optional(),
  notes: z.string().optional(),
});
type NewEntryFormValues = z.infer<typeof entryFormSchema>;

interface NewEntryTabProps {
  menuItems: MenuItemType[];
  tables: RestaurantTable[];
  rooms: Room[];
  bookings: Booking[];
  refreshData: () => Promise<void>;
  selectedMenuItem: MenuItemType | null;
  onMenuItemSelect: (itemId: string | null) => void;
}

export const NewEntryTab: React.FC<NewEntryTabProps> = ({ 
    menuItems, tables, rooms, bookings, refreshData, selectedMenuItem, onMenuItemSelect 
}) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { currencySymbol, convertPrice } = useCurrency();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cart, setCart] = useState<OrderItem[]>([]);
    
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [itemCategory, setItemCategory] = useState('all');
    
    const [selectedPortionName, setSelectedPortionName] = useState<string>('');
    const [newItemNote, setNewItemNote] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    
    const form = useForm<NewEntryFormValues>({
        resolver: zodResolver(entryFormSchema),
        defaultValues: {
            entryType: 'pos',
            customerName: "Walk-in Guest",
            orderType: 'Dine-in',
        }
    });

    const entryType = form.watch("entryType");
    const orderType = form.watch("orderType");

    const availableTables = tables.filter(t => t.status === 'Available');
    
    const occupiedRoomBookings = useMemo(() => {
        const today = new Date();
        return bookings.filter(b => {
            if (b.bookingType !== 'room' || b.status !== 'confirmed') return false;
            try {
                if (!b.date || !isValid(parseISO(b.date))) return false;
                const bookingDate = parseISO(b.date);
                return isWithinInterval(today, { start: startOfDay(bookingDate), end: endOfDay(bookingDate) });
            } catch {
                return false;
            }
        });
    }, [bookings]);

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

    // When a menu item is selected from the dropdown, reset the portion selection
    useEffect(() => {
        if (selectedMenuItem) {
            const parsedPortions = parsePortionDetails(selectedMenuItem.portionDetails);
            const defaultPortion = parsedPortions.find(p => p.isDefault) || parsedPortions[0];
            if (defaultPortion) {
                setSelectedPortionName(defaultPortion.name);
            }
        }
    }, [selectedMenuItem]);
    
    const addItemToCart = (itemToAdd: MenuItemType, portion: MenuItemPortion, quantity: number, note?: string) => {
        setCart(prev => {
          const existingItemIndex = prev.findIndex(i =>
            i.menuItemId === itemToAdd.id &&
            i.selectedPortion === portion.name &&
            (i.note || '') === (note || '')
          );
    
          if (existingItemIndex > -1) {
            const newCart = [...prev];
            newCart[existingItemIndex].quantity += quantity;
            return newCart;
          }
    
          return [...prev, {
            menuItemId: itemToAdd.id,
            name: itemToAdd.name,
            price: portion.price,
            quantity: quantity,
            selectedPortion: portion.name,
            note: note || undefined
          }];
        });
        toast({ title: "Item Added", description: `${quantity} x ${itemToAdd.name} (${portion.name}) added to cart.` });
    };

    const handleAddItemToCart = () => {
        const itemToAdd = selectedMenuItem;
        if (!itemToAdd) {
          toast({ title: "No Item Selected", description: "Please select an item from the list first.", variant: "destructive" });
          return;
        }

        const parsedPortions = parsePortionDetails(itemToAdd.portionDetails);
        if (!parsedPortions || parsedPortions.length === 0) {
          toast({ title: "Item Error", description: "This menu item has improperly configured portions.", variant: "destructive" });
          return;
        }
        
        const portion = parsedPortions.find(p => p.name === selectedPortionName);
    
        if (!portion) {
          toast({ title: "Item Error", description: `Selected portion '${selectedPortionName}' not found. Please re-select.`, variant: "destructive" });
          return;
        }
        
        addItemToCart(itemToAdd, portion, newItemQuantity, newItemNote);
    
        // Reset inputs for the next item
        onMenuItemSelect(null);
        setNewItemQuantity(1);
        setNewItemNote('');
        setItemSearchTerm('');
    };

    const handleUpdateCartItem = (index: number, quantity: number) => {
        if (quantity < 1) {
            setCart(prev => prev.filter((_, i) => i !== index));
        } else {
            setCart(prev => prev.map((item, i) => i === index ? {...item, quantity} : item));
        }
    };
    
    const handleUpdateCartItemNote = (index: number, note: string) => {
        setCart(prev => prev.map((item, i) => i === index ? {...item, note} : item));
    };
    
    async function onSubmit(values: NewEntryFormValues) {
        setIsSubmitting(true);
        if (values.entryType === 'pos') {
            if (cart.length === 0) {
                toast({ title: "Cart is empty", description: "Please add items to the order.", variant: "destructive" });
                setIsSubmitting(false);
                return;
            }
            if (values.orderType === 'In-Room Dining') {
                if (!values.bookingId) {
                     toast({ title: "Booking Required", description: "Please select a guest's room booking for in-room dining.", variant: "destructive" });
                     setIsSubmitting(false);
                     return;
                }
                const booking = bookings.find(b => b.id === values.bookingId);
                if (!booking || !booking.userId) {
                    toast({ title: "Booking or User ID not found", variant: "destructive" });
                    setIsSubmitting(false);
                    return;
                }

                const result = await placeInRoomOrder(booking.id, booking.userId, cart);
                if (result.success) {
                    toast({ title: "Success", description: result.message });
                    form.reset({ entryType: 'pos', customerName: 'Walk-in Guest', orderType: 'Dine-in' });
                    setCart([]);
                    await refreshData();
                } else {
                    toast({ title: "Error", description: result.message, variant: "destructive" });
                }

            } else {
                const orderData: Partial<Order> = {
                    customerName: values.customerName,
                    items: cart,
                    total: cartTotal,
                    orderType: values.orderType || 'Dine-in',
                    tableNumber: values.tableNumber,
                    userId: user?.id,
                    outletId: values.outletId
                };
                const result = await placeNewWalkInOrder(orderData);
                if (result.success) {
                    toast({ title: "Success", description: result.message });
                    form.reset({ entryType: 'pos', customerName: 'Walk-in Guest', orderType: 'Dine-in' });
                    setCart([]);
                    await refreshData();
                } else {
                    toast({ title: "Error", description: result.message, variant: "destructive" });
                }
            }
        } else { // Booking
            if (!values.date || !values.time || !values.partySize) {
                 toast({ title: "Missing Info", description: "Date, time and party size are required for bookings.", variant: "destructive" });
                 setIsSubmitting(false);
                 return;
            }
            const bookingData: Booking = {
                id: `BKG-${crypto.randomUUID().substring(0,8).toUpperCase()}`,
                customerName: values.customerName,
                phone: values.phone!,
                email: values.email,
                date: format(values.date, "yyyy-MM-dd"), // Correctly format the date
                time: values.time,
                partySize: values.partySize,
                items: cart,
                status: 'pending',
                bookingType: 'table',
                requestedResourceId: values.requestedResourceId,
                // createdAt is set on the server
            };
            const result = await saveNewBooking(bookingData);
             if (result.success) {
                toast({ title: "Booking Request Sent!", description: `Booking #${String(result.bookingId).substring(0,8)} has been received.` });
                form.reset({ entryType: 'booking' });
                setCart([]);
                await refreshData();
            } else {
                toast({ title: "Booking Failed", description: result.message, variant: "destructive" });
            }
        }
        setIsSubmitting(false);
    }
    
    const filteredMenuItems = useMemo(() => {
      // First check for an exact ID match
      const potentialIdMatch = menuItems.find(item => String(item.id) === itemSearchTerm.trim());
      if (potentialIdMatch) {
          return [potentialIdMatch];
      }

      // If no ID match, perform the regular search
      return menuItems.filter(item => {
        const categoryMatch = itemCategory === 'all' || item.category === itemCategory;
        const searchMatch = itemSearchTerm === '' || item.name.toLowerCase().includes(itemSearchTerm.toLowerCase());
        return categoryMatch && searchMatch && item.isAvailable;
      });
    }, [menuItems, itemSearchTerm, itemCategory]);

    const parsedSelectedMenuItemPortions = useMemo(() => {
        if (!selectedMenuItem) return [];
        return parsePortionDetails(selectedMenuItem.portionDetails);
    }, [selectedMenuItem]);
    
    const availableTimes = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <FormField
                            control={form.control}
                            name="entryType"
                            render={({ field }) => (
                                <FormItem>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="pos" id="pos"/></FormControl><FormLabel htmlFor="pos">New Walk-in/POS Order</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="booking" id="booking"/></FormControl><FormLabel htmlFor="booking">Advance Booking</FormLabel></FormItem>
                                </RadioGroup>
                                </FormItem>
                            )}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>
                        
                        {entryType === 'pos' && (
                            <div className="space-y-4">
                                <FormField control={form.control} name="orderType" render={({ field }) => (
                                    <FormItem><FormLabel>Order Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Dine-in">Dine-in</SelectItem><SelectItem value="Takeaway">Takeaway</SelectItem><SelectItem value="In-Room Dining">In-Room Dining</SelectItem></SelectContent></Select></FormItem>
                                )}/>
                                {orderType === 'Dine-in' && <FormField control={form.control} name="tableNumber" render={({ field }) => (<FormItem><FormLabel>Table</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a table"/></SelectTrigger></FormControl><SelectContent>{availableTables.map(t=><SelectItem key={t.id} value={t.name}>{t.name} (Cap: {t.capacity})</SelectItem>)}</SelectContent></Select></FormItem>)}/>}
                                {orderType === 'In-Room Dining' && <FormField control={form.control} name="bookingId" render={({ field }) => (<FormItem><FormLabel>Room Guest</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select occupied room"/></SelectTrigger></FormControl><SelectContent>{occupiedRoomBookings.map(b=><SelectItem key={b.id} value={b.id}>{rooms.find(r=>r.id===b.assignedResourceId)?.name} ({b.customerName})</SelectItem>)}</SelectContent></Select></FormItem>)}/>}
                            </div>
                        )}
                        {entryType === 'booking' && (
                            <div className="space-y-4">
                               <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} type="tel"/></FormControl><FormMessage/></FormItem>)}/>
                               <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email"/></FormControl><FormMessage/></FormItem>)}/>
                               <FormField control={form.control} name="partySize" render={({ field }) => (<FormItem><FormLabel>Party Size</FormLabel><FormControl><Input {...field} type="number"/></FormControl><FormMessage/></FormItem>)}/>
                               <div className="grid grid-cols-2 gap-4">
                                  <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn(!field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(d) => d < startOfDay(new Date())}/></PopoverContent></Popover></FormItem>)}/>
                                  <FormField control={form.control} name="time" render={({ field }) => (<FormItem><FormLabel>Time</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select time"/></SelectTrigger></FormControl><SelectContent>{availableTimes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FormItem>)}/>
                               </div>
                               <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>)}/>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Cart</CardTitle></CardHeader>
                        <CardContent>
                           <ScrollArea className="h-40 border rounded-md p-2">
                            {cart.length === 0 ? <p className="text-muted-foreground text-center p-4">Cart is empty</p> : 
                            <div className="space-y-2">
                                {cart.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm p-1.5 bg-background rounded-md">
                                        <div>
                                            <p className="font-medium">{item.name} {item.selectedPortion !== 'fixed' && `(${item.selectedPortion})`}</p>
                                            <p className="text-xs text-muted-foreground">{currencySymbol}{convertPrice(item.price).toFixed(2)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input type="number" value={item.quantity} onChange={e => handleUpdateCartItem(index, parseInt(e.target.value, 10))} className="w-16 h-8"/>
                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={()=>handleUpdateCartItem(index, 0)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            }
                           </ScrollArea>
                           <div className="text-right font-bold text-lg mt-2">Total: {currencySymbol}{convertPrice(cartTotal).toFixed(2)}</div>
                        </CardContent>
                         <CardFooter>
                           <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{entryType === 'pos' ? "Place Order" : "Submit Booking Request"}</Button>
                        </CardFooter>
                    </Card>

                     <Card>
                        <CardHeader><CardTitle>Add Items</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2 mb-2">
                                <Input placeholder="Search or Enter Item ID" value={itemSearchTerm} onChange={e => setItemSearchTerm(e.target.value)} />
                                <Select value={itemCategory} onValueChange={setItemCategory}>
                                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All</SelectItem>
                                      {Array.from(new Set(menuItems.map(i=>i.category))).map(c=><SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <ScrollArea className="h-48 border rounded-md p-2">
                                {filteredMenuItems.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-1.5 hover:bg-muted rounded-md">
                                        <div className="flex-grow"><p className="text-sm font-medium">{item.name}</p></div>
                                        <Button type="button" size="sm" variant="outline" onClick={() => onMenuItemSelect(item.id)}><PlusCircle className="mr-1 h-4 w-4"/>Add</Button>
                                    </div>
                                ))}
                            </ScrollArea>
                             {selectedMenuItem && (
                                <div className="p-3 border rounded-md bg-background space-y-3">
                                    <p className="font-semibold">Selected: {selectedMenuItem.name}</p>
                                    {parsedSelectedMenuItemPortions.length > 1 && (
                                        <RadioGroup value={selectedPortionName} onValueChange={setSelectedPortionName} className="space-y-1">
                                            {parsedSelectedMenuItemPortions.map(p => (
                                                <div key={p.name} className="flex items-center space-x-2"><RadioGroupItem value={p.name} id={`portion-${p.name}`}/><Label htmlFor={`portion-${p.name}`}>{p.name} ({currencySymbol}{convertPrice(p.price).toFixed(2)})</Label></div>
                                            ))}
                                        </RadioGroup>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <div className="flex-grow"><Label htmlFor="newItemQuantity">Quantity</Label><Input id="newItemQuantity" type="number" min="1" value={newItemQuantity} onChange={(e) => setNewItemQuantity(parseInt(e.target.value, 10) || 1)} className="h-9"/></div>
                                        <div className="flex-grow-[2]"><Label htmlFor="newItemNote">Note (Optional)</Label><Input id="newItemNote" placeholder="e.g., Extra spicy" value={newItemNote} onChange={e => setNewItemNote(e.target.value)} className="h-9"/></div>
                                    </div>
                                    <Button type="button" onClick={handleAddItemToCart} className="w-full">Confirm & Add to Cart</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </form>
        </Form>
    );
};
