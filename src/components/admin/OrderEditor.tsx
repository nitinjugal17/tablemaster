
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Order, OrderItem, PaymentType, MenuItem as MenuItemType, MenuItemPortion } from "@/lib/types";
import { ALL_PAYMENT_TYPES, BASE_CURRENCY_CODE, ALL_ORDER_STATUSES, ALL_ORDER_TYPES } from "@/lib/types";
import { Trash2, PlusCircle, Search, MessageSquare, SlidersHorizontal, FileText, Wallet } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea'; 
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { parsePortionDetails } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";


const orderItemSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required."),
  name: z.string().min(1, "Item name is required."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  note: z.string().optional(),
  selectedPortion: z.string().optional(),
});

const orderEditorSchema = z.object({
  customerName: z.string().min(2, "Customer name must be at least 2 characters."),
  status: z.enum(ALL_ORDER_STATUSES),
  paymentType: z.enum(ALL_PAYMENT_TYPES).default('Pending'),
  paymentId: z.string().optional(),
  orderType: z.enum(ALL_ORDER_TYPES),
  tableNumber: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Order must have at least one item."),
});

type OrderEditorValues = z.infer<typeof orderEditorSchema>;

interface OrderEditorProps {
  order: Order; 
  menuItems: MenuItemType[]; 
  onSave: (data: Order) => void; 
  currencySymbol: string;
  convertPrice: (price: number) => number;
}

const getParsedOrderItems = (items: OrderItem[] | string | undefined): OrderItem[] => {
    if (!items) return [];
    if (Array.isArray(items)) return items.map(item => ({
        ...item, 
        price: Number(item.price) || 0, 
        quantity: Number(item.quantity) || 1,
        note: item.note || '', 
    }));
    if (typeof items === 'string') {
        try {
            const parsed = JSON.parse(items);
            return Array.isArray(parsed) ? parsed.map(item => ({
                ...item,
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1,
                note: item.note || ''
            })) : [];
        } catch (e) {
            console.error("Failed to parse order items string:", items, e);
            return [];
        }
    }
    return [];
};

export function OrderEditor({ order, menuItems, onSave, currencySymbol, convertPrice }: OrderEditorProps) {
  const { toast } = useToast();
  
  const form = useForm<OrderEditorValues>({
    resolver: zodResolver(orderEditorSchema),
    defaultValues: {
      customerName: order.customerName || "",
      status: order.status,
      paymentType: order.paymentType || 'Pending',
      paymentId: order.paymentId || "",
      orderType: order.orderType,
      tableNumber: order.tableNumber || "",
      items: getParsedOrderItems(order.items),
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  const calculateTotalInBase = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  };
  
  const [currentTotalInBase, setCurrentTotalInBase] = useState<number>(calculateTotalInBase(getParsedOrderItems(order.items)));
  const displayCurrentTotal = convertPrice(currentTotalInBase);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && name.startsWith("items")) {
        const currentItems = form.getValues("items");
        setCurrentTotalInBase(calculateTotalInBase(currentItems));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  const addItemToCart = (item: MenuItemType, portion: MenuItemPortion, quantity: number, note?: string) => {
    const existingItemIndex = fields.findIndex(
      (cartItem) => cartItem.menuItemId === item.id && cartItem.selectedPortion === portion.name && (cartItem.note || "") === (note || "")
    );

    if (existingItemIndex > -1) {
      const existingItem = fields[existingItemIndex];
      update(existingItemIndex, { ...existingItem, quantity: existingItem.quantity + quantity });
    } else {
      append({
        menuItemId: item.id,
        name: item.name,
        price: portion.price,
        quantity: quantity,
        note: note,
        selectedPortion: portion.name,
      });
    }
    toast({ title: "Item Added", description: `${quantity} x ${item.name} (${portion.name}) added to order.`});
  };
  
  const filteredMenuItems = useMemo(() => {
    const potentialIdMatch = menuItems.find(item => String(item.id) === itemSearchTerm.trim());
    if (potentialIdMatch) {
      return [potentialIdMatch];
    }
    return menuItems.filter(item => item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) && item.isAvailable);
  }, [menuItems, itemSearchTerm]);

  const handleIdSearchAndAdd = (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (filteredMenuItems.length === 1) {
          const item = filteredMenuItems[0];
          const portions = parsePortionDetails(item.portionDetails);
          const defaultPortion = portions.find(p => p.isDefault) || portions[0];
          if (!defaultPortion) {
              toast({ title: "Item Error", description: `Item "${item.name}" has no defined portions/price. Cannot add.`, variant: "destructive" });
              return;
          }
          addItemToCart(item, defaultPortion, 1);
          setItemSearchTerm('');
      } else {
          toast({ title: "Select Item", description: `Please refine your search to add an item.`, variant: "destructive" });
      }
  };


  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      remove(index);
    } else {
      const item = fields[index];
      update(index, { ...item, quantity: newQuantity });
    }
  };

  function onSubmit(data: OrderEditorValues) {
    const newTotalInBase = calculateTotalInBase(data.items);
    const updatedData: Order = {
        ...order,
        customerName: data.customerName,
        status: data.status,
        paymentType: data.paymentType,
        paymentId: data.paymentId,
        orderType: data.orderType,
        tableNumber: data.orderType === 'Dine-in' ? data.tableNumber : undefined,
        bookingId: data.orderType === 'In-Room Dining' ? order.bookingId : undefined,
        items: data.items, 
        total: newTotalInBase, 
    };
    onSave(updatedData);
  }

  return (
    <Card className="shadow-none border-0 flex flex-col flex-grow min-h-0">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow min-h-0">
          <CardContent className="flex-grow p-1 sm:p-4 space-y-5 overflow-y-auto">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Order Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {ALL_ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="orderType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Order Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {ALL_ORDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {form.watch('orderType') === 'Dine-in' && (
                <FormField
                    control={form.control}
                    name="tableNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Table Number</FormLabel>
                        <FormControl><Input placeholder="e.g., T5" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="paymentType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Payment Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {ALL_PAYMENT_TYPES.map(pt => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="paymentId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Payment/Transaction ID (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., upi_txn_123" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormItem>
                <FormLabel>Order ID</FormLabel>
                <Input value={String(order.id)} readOnly disabled />
                <FormDescription>Order ID cannot be changed.</FormDescription>
            </FormItem>

            <div className="space-y-3 border-t pt-4">
              <h3 className="text-lg font-medium">Order Items</h3>
              {fields.map((field, index) => {
                const displayItemPrice = convertPrice(field.price);
                return (
                <div key={field.id} className="p-2.5 border rounded-md bg-muted/50 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-grow">
                      <p className="font-medium text-sm">{field.name}</p>
                      <p className="text-xs text-muted-foreground">{currencySymbol}{displayItemPrice.toFixed(2)} each</p>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      {...form.register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                      defaultValue={field.quantity}
                      onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value, 10) || 1)}
                      className="w-20 h-8 text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )})}
               <FormField
                  control={form.control}
                  name="items"
                  render={() => <FormMessage className="mt-0 pt-0" />} 
                />

              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-md font-medium">Add New Item to Order</h4>
                 <div className="relative w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="itemSearchInputAdminEditor"
                        placeholder="Search by name, or enter an exact Item ID..."
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-sm"
                    />
                </div>
                 {itemSearchTerm && (
                  <ScrollArea className="h-32 border rounded-md">
                    {filteredMenuItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 hover:bg-muted">
                        <span className="text-sm">{item.name}</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => {
                             const portions = parsePortionDetails(item.portionDetails);
                             const defaultPortion = portions.find(p => p.isDefault) || portions[0];
                             addItemToCart(item, defaultPortion, 1);
                             setItemSearchTerm('');
                        }}><PlusCircle className="mr-2 h-4 w-4"/>Add</Button>
                      </div>
                    ))}
                    {filteredMenuItems.length === 0 && <p className="p-2 text-sm text-muted-foreground">No matches found.</p>}
                  </ScrollArea>
                )}
              </div>
            </div>
          </CardContent>
          <div className="flex-shrink-0 pt-4 border-t p-1 sm:p-4 space-y-3">
            <div className="flex justify-between items-center font-semibold text-lg">
                <span>Updated Total:</span>
                <span>{currencySymbol}{displayCurrentTotal.toFixed(2)}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button type="button" variant="secondary" className="w-full">
                            <Wallet className="mr-2 h-4 w-4"/> Manage Bill
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <CardHeader>
                            <CardTitle>Manage Bill</CardTitle>
                            <CardDescription>Split the bill or transfer items to another table/order.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button className="w-full" variant="outline" onClick={() => toast({title: "Conceptual Feature", description: "This would open a bill splitting interface."})}>Split Bill (Not Implemented)</Button>
                            <Button className="w-full" variant="outline" onClick={() => toast({title: "Conceptual Feature", description: "This would open an item transfer interface."})}>Transfer Items (Not Implemented)</Button>
                        </CardContent>
                    </DialogContent>
                 </Dialog>
                <Button type="submit" className="w-full">
                    Save Order Changes
                </Button>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
}
