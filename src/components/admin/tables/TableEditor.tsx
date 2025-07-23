
"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { RestaurantTable, TableStatus } from '@/lib/types';
import { ALL_TABLE_STATUSES } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, ListFilter, Loader2, MoreVertical, Columns3, Save, SquarePen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as AlertDialogFooterComponent, // Renamed to avoid conflict
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader as TableHeaderComponent, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getRestaurantTables, saveRestaurantTables } from '@/app/actions/data-management-actions';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";


const tableEditorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Table name/number is required."),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1."),
  status: z.enum(ALL_TABLE_STATUSES),
  notes: z.string().optional(),
  outletId: z.string().optional(),
});
type TableEditorValues = z.infer<typeof tableEditorSchema>;

interface TableEditorProps {
  table?: Partial<RestaurantTable>;
  onSave: (data: TableEditorValues) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

const TableEditor: React.FC<TableEditorProps> = ({ table, onSave, onClose, isSaving }) => {
  const form = useForm<TableEditorValues>({
    resolver: zodResolver(tableEditorSchema),
    defaultValues: {
      id: table?.id || "",
      name: table?.name || "",
      capacity: table?.capacity || 1,
      status: table?.status || 'Available',
      notes: table?.notes || "",
      outletId: table?.outletId || "",
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl text-primary">
          {table?.id ? `Edit Table: ${table.name}` : "Create New Table"}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Table Name/Number *</FormLabel>
                <FormControl><Input placeholder="e.g., T1, Window Booth, Patio 5" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity *</FormLabel>
                <FormControl><Input type="number" min="1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {ALL_TABLE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="outletId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Outlet (Optional)</FormLabel>
                <FormControl><Input placeholder="e.g., outlet-123" {...field} /></FormControl>
                 <FormDescription>Assign this table to a specific outlet ID.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="e.g., Near window, high-traffic area" {...field} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Table
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};


export default TableEditor;
