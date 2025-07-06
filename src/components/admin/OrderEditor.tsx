
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { Order, OrderItem, PaymentType, MenuItem as MenuItemType } from "@/lib/types";
import { ALL_PAYMENT_TYPES, BASE_CURRENCY_CODE, ALL_ORDER_STATUSES, ALL_ORDER_TYPES } from "@/lib/types";
import { Trash2, PlusCircle, Search, MessageSquare, SlidersHorizontal } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/useCurrency";
import { Textarea } from '@/components/ui/textarea'; 
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";


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
  onSave: (data: Partial<Order>) => void; 
}

export function OrderEditor({ order, menuItems, onSave }: OrderEditorProps) {
  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();
  
  const form = useForm<OrderEditorValues>({
    resolver: zodResolver(orderEditorSchema),
    defaultValues: {
      customerName: order.customerName || "",
      status: order.status,
      paymentType: order.paymentType || 'Pending',
      paymentId: order.paymentId || "",
      orderType: order.orderType,
      tableNumber: order.tableNumber || "",
      items: order.items && order.items.length > 0 
        ? order.items.map(item => ({
            ...item, 
            price: Number(item.price) || 0, 
            quantity: Number(item.quantity) || 1,
            note: item.note || '', 
          })) 
        : [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const [newItemId, setNewItemId] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemNote, setNewItemNote] = useState<string>(""); 
  
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [selectedItemCategory, setSelectedItemCategory] = useState('all');
  const [itemFilterCuisine, setItemFilterCuisine] = useState('all');
  const [itemFilterDietary, setItemFilterDietary] = useState('all');

  
  const calculateTotalInBase = (items: OrderItem[]): number => {
    return items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  };
  
  const [currentTotalInBase, setCurrentTotalInBase] = useState<number>(calculateTotalInBase(order.items));
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


  const handleAddItem = () => {
    if (!newItemId || newItemQuantity < 1) {
      toast({ title: "Error Adding Item", description: "Please select an item and specify a valid quantity.", variant: "destructive" });
      return;
    }
    const selectedMenuItem = menuItems.find(mi => mi.id === newItemId);
    if (!selectedMenuItem) {
      toast({ title: "Error Adding Item", description: "Selected menu item not found.", variant: "destructive" });
      return;
    }

    const defaultPortion = selectedMenuItem.portionDetails?.find(p => p.isDefault) || selectedMenuItem.portionDetails?.[0];
    if (!defaultPortion) {
        toast({ title: "Item Error", description: `Item "${selectedMenuItem.name}" has no defined portions/price. Cannot add.`, variant: "destructive"});
        return;
    }

    append({
      menuItemId: selectedMenuItem.id,
      name: selectedMenuItem.name,
      price: defaultPortion.price,
      quantity: newItemQuantity,
      note: newItemNote,
      selectedPortion: defaultPortion.name,
    });

    setNewItemId("");
    setNewItemQuantity(1);
    setNewItemNote(""); 
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
    const updatedData: Partial<Order> = {
        id: order.id, 
        customerName: data.customerName,
        status: data.status,
        paymentType: data.paymentType,
        paymentId: data.paymentId,
        orderType: data.orderType,
        tableNumber: data.orderType === 'Dine-in' ? data.tableNumber : undefined,
        items: data.items, 
        total: newTotalInBase, 
    };
    onSave(updatedData);
    toast({ title: "Order Details Updated (Locally)", description: `Changes to order #${String(order.id).substring(0,8)} are saved in this session.` });
  }

  const uniqueItemCategories = useMemo(() => ['all', ...new Set(menuItems.map(item => item.category).filter(Boolean).sort())], [menuItems]);
  const uniqueCuisines = useMemo(() => ['all', ...new Set(menuItems.map(item => item.cuisine).filter((c): c is string => !!c).sort())], [menuItems]);
  const uniqueDietaryOptions = useMemo(() => ['all', ...new Set(menuItems.map(item => item.dietaryRestrictions).filter((d): d is string => !!d).sort())], [menuItems]);


  const filteredMenuItemsForSelect = useMemo(() => {
    return menuItems.filter(item => {
        const lowerSearchTerm = itemSearchTerm.toLowerCase();
        const searchFields = [
            item.name.toLowerCase(),
            item.id.toLowerCase(),
            item.description?.toLowerCase() || '',
            item.ingredients?.toLowerCase() || '',
            item.synonyms?.toLowerCase() || '',
            item.category.toLowerCase(),
            item.cuisine?.toLowerCase() || '',
        ];
        const searchMatch = lowerSearchTerm === '' || searchFields.some(field => field.includes(lowerSearchTerm));
        
        const categoryMatch = selectedItemCategory === 'all' || item.category === selectedItemCategory;
        const cuisineMatch = itemFilterCuisine === 'all' || item.cuisine === itemFilterCuisine;
        const dietaryMatch = itemFilterDietary === 'all' || item.dietaryRestrictions === itemFilterDietary;
        
        return searchMatch && categoryMatch && cuisineMatch && dietaryMatch && item.isAvailable;
    });
  }, [menuItems, itemSearchTerm, selectedItemCategory, itemFilterCuisine, itemFilterDietary]);

  const clearItemFilters = () => {
    setItemSearchTerm('');
    setSelectedItemCategory('all');
    setItemFilterCuisine('all');
    setItemFilterDietary('all');
  };


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
                  <FormField
                    control={form.control}
                    name={`items.${index}.note`}
                    render={({ field: noteField }) => (
                      <FormItem className="ml-1">
                        <FormLabel className="text-xs sr-only">Note for {field.name}</FormLabel>
                         <div className="flex items-center gap-1.5">
                           <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                           <FormControl>
                            <Textarea
                                placeholder="Item specific instructions (e.g., no garlic)"
                                {...noteField}
                                rows={1}
                                className="text-xs min-h-[2rem] resize-none"
                            />
                            </FormControl>
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              )})}
               <FormField
                  control={form.control}
                  name="items"
                  render={() => <FormMessage className="mt-0 pt-0" />} 
                />

              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-md font-medium">Add New Item to Order</h4>
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="itemSearchInputAdminEditor"
                            placeholder="Search name, ID, ingredients..."
                            value={itemSearchTerm}
                            onChange={(e) => setItemSearchTerm(e.target.value)}
                            className="pl-9 h-9 text-sm"
                        />
                    </div>
                    <div className="w-full sm:w-40">
                        <Label htmlFor="itemCategorySelectAdminEditor" className="text-xs sr-only">Category</Label>
                        <Select value={selectedItemCategory} onValueChange={setSelectedItemCategory}>
                            <SelectTrigger id="itemCategorySelectAdminEditor" className="h-9 text-sm">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueItemCategories.map(cat => <SelectItem key={cat} value={cat} className="text-sm capitalize">{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0"><SlidersHorizontal className="h-4 w-4"/></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 z-50" align="end">
                            <div className="grid gap-4">
                                <div className="space-y-1"><h4 className="font-medium leading-none text-sm">More Item Filters</h4></div>
                                <div className="grid gap-2">
                                    <div className="grid grid-cols-3 items-center gap-2">
                                        <Label htmlFor="itemFilterCuisineEditor" className="text-xs">Cuisine</Label>
                                        <Select value={itemFilterCuisine} onValueChange={setItemFilterCuisine}>
                                            <SelectTrigger id="itemFilterCuisineEditor" className="col-span-2 h-8 text-xs">
                                                <SelectValue placeholder="Cuisine" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {uniqueCuisines.map(c => <SelectItem key={c} value={c} className="capitalize text-xs">{c === 'all' ? 'All' : c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-2">
                                        <Label htmlFor="itemFilterDietaryEditor" className="text-xs">Dietary</Label>
                                        <Select value={itemFilterDietary} onValueChange={setItemFilterDietary}>
                                            <SelectTrigger id="itemFilterDietaryEditor" className="col-span-2 h-8 text-xs">
                                                <SelectValue placeholder="Dietary" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {uniqueDietaryOptions.map(opt => <SelectItem key={opt} value={opt} className="capitalize text-xs">{opt === 'all' ? 'All' : opt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button onClick={clearItemFilters} variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground hover:text-primary">Clear Item Filters</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex items-end gap-2 mt-2">
                    <div className="flex-grow">
                    <Label htmlFor="newItemSelectAdminEditor" className="text-xs sr-only">Select Item</Label>
                    <Select value={newItemId} onValueChange={setNewItemId}>
                        <SelectTrigger id="newItemSelectAdminEditor" className="h-9 text-sm">
                        <SelectValue placeholder={filteredMenuItemsForSelect.length > 0 ? "Select item to add" : "No items match filters"} />
                        </SelectTrigger>
                        <SelectContent>
                        {filteredMenuItemsForSelect.length > 0 ? (
                            filteredMenuItemsForSelect.map(mi => {
                              const defaultPortion = mi.portionDetails?.find(p => p.isDefault) || mi.portionDetails?.[0];
                              const displayItemPrice = defaultPortion ? convertPrice(defaultPortion.price) : 0;
                              return (
                                <SelectItem key={mi.id} value={mi.id} disabled={!mi.isAvailable} className="text-sm">
                                    {mi.name} ({currencySymbol}{displayItemPrice.toFixed(2)}) { !mi.isAvailable && '(Unavailable)'}
                                </SelectItem>
                              )
                            })
                        ) : (
                            <div className="p-2 text-center text-xs text-muted-foreground">No items found.</div>
                        )}
                        </SelectContent>
                    </Select>
                    </div>
                    <div className="w-24">
                    <Label htmlFor="newItemQuantityAdminEditor" className="text-xs sr-only">Quantity</Label>
                    <Input
                        id="newItemQuantityAdminEditor"
                        type="number"
                        min="1"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(parseInt(e.target.value, 10) || 1)}
                        className="h-9 text-sm"
                    />
                    </div>
                </div>
                <div className="mt-2">
                    <Label htmlFor="newItemNoteAdminEditor" className="text-xs sr-only">Note for New Item (Optional)</Label>
                    <Textarea
                        id="newItemNoteAdminEditor"
                        placeholder="e.g., extra cheese, less spicy"
                        value={newItemNote}
                        onChange={(e) => setNewItemNote(e.target.value)}
                        rows={1}
                        className="text-xs min-h-[2rem] resize-none"
                    />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={!newItemId} className="w-full mt-2">
                    <PlusCircle className="h-4 w-4 mr-2" /> Add to Order
                </Button>
              </div>
            </div>
          </CardContent>
          <div className="flex-shrink-0 pt-4 border-t p-1 sm:p-4">
            <div className="flex justify-between items-center font-semibold text-lg mb-3">
                <span>Updated Total:</span>
                <span>{currencySymbol}{displayCurrentTotal.toFixed(2)}</span>
            </div>
            <Button type="submit" className="w-full">
                Save Order Changes
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
