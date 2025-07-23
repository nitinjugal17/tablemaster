
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import type { StockItem, StockUnit } from "@/lib/types";
import { ALL_STOCK_UNITS, BASE_CURRENCY_CODE } from "@/lib/types";
import { DialogFooter } from "@/components/ui/dialog";
import React from "react";

const stockItemEditorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Item name must be at least 2 characters."),
  category: z.string().min(2, "Category is required."),
  unit: z.enum([...ALL_STOCK_UNITS], { required_error: "Unit is required." }),
  currentStock: z.coerce.number().min(0, "Stock cannot be negative.").default(0),
  reorderLevel: z.coerce.number().min(0, "Reorder level cannot be negative.").default(0),
  supplier: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, `Purchase price (in ${BASE_CURRENCY_CODE}) cannot be negative.`).default(0),
  lastPurchaseDate: z.date().optional(),
  expiryDate: z.date().optional().nullable(),
});

export type StockItemEditorValues = z.infer<typeof stockItemEditorSchema>;

interface StockItemEditorProps {
  stockItem?: Partial<StockItem>;
  onSave: (data: StockItem) => void;
  onClose: () => void;
  existingItemNames: string[]; // For uniqueness validation
}

export const StockItemEditor: React.FC<StockItemEditorProps> = ({ stockItem, onSave, onClose, existingItemNames }) => {
  const form = useForm<StockItemEditorValues>({
    resolver: zodResolver(stockItemEditorSchema.refine(data => {
        if (!stockItem?.id) { // New item
            return !existingItemNames.map(n => n.toLowerCase()).includes(data.name.toLowerCase());
        }
        // Editing item: check against other item names
        return !existingItemNames.filter(n => n.toLowerCase() !== stockItem.name?.toLowerCase()).includes(data.name.toLowerCase());
    }, {message: "An item with this name already exists.", path: ["name"]})),
    defaultValues: {
      id: stockItem?.id || "",
      name: stockItem?.name || "",
      category: stockItem?.category || "",
      unit: stockItem?.unit || ALL_STOCK_UNITS[0],
      currentStock: stockItem?.currentStock || 0,
      reorderLevel: stockItem?.reorderLevel || 0,
      supplier: stockItem?.supplier || "",
      purchasePrice: stockItem?.purchasePrice || 0,
      lastPurchaseDate: stockItem?.lastPurchaseDate ? parseISO(stockItem.lastPurchaseDate) : undefined,
      expiryDate: stockItem?.expiryDate ? parseISO(stockItem.expiryDate) : undefined,
    },
  });

  function onSubmit(data: StockItemEditorValues) {
    const finalData: StockItem = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      category: data.category,
      unit: data.unit,
      currentStock: data.currentStock,
      reorderLevel: data.reorderLevel,
      supplier: data.supplier,
      purchasePrice: data.purchasePrice,
      lastPurchaseDate: data.lastPurchaseDate ? data.lastPurchaseDate.toISOString() : undefined,
      expiryDate: data.expiryDate ? data.expiryDate.toISOString() : undefined,
    };
    onSave(finalData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Item ID</FormLabel>
              <FormControl><Input placeholder="Auto-generated if new" {...field} disabled /></FormControl>
              <FormDescription>Unique identifier. Cannot be changed after creation.</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name *</FormLabel>
              <FormControl><Input placeholder="e.g., Basmati Rice, Chicken Breast" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <FormControl><Input placeholder="e.g., Grains, Poultry, Dairy" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Unit *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                    <SelectContent>
                    {ALL_STOCK_UNITS.map(u => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Purchase Price per Unit ({BASE_CURRENCY_CODE}) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 50.00" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currentStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Stock *</FormLabel>
                <FormControl><Input type="number" min="0" placeholder="e.g., 100" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reorderLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reorder Level *</FormLabel>
                <FormControl><Input type="number" min="0" placeholder="e.g., 20" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier (Optional)</FormLabel>
              <FormControl><Input placeholder="e.g., Local Farms Inc." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField control={form.control} name="lastPurchaseDate" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Last Purchase Date (Optional)</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                  </PopoverContent>
                </Popover><FormMessage />
              </FormItem>
            )}/>
             <FormField control={form.control} name="expiryDate" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Expiry Date (Optional)</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick expiry date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover><FormMessage />
              </FormItem>
            )}/>
        </div>
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{stockItem?.id ? "Save Changes" : "Add Stock Item"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
