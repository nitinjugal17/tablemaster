
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import type { Expense, ExpenseCategory, RecurrenceType } from "@/lib/types";
import { ALL_EXPENSE_CATEGORIES, ALL_RECURRENCE_TYPES, BASE_CURRENCY_CODE } from "@/lib/types";
import { DialogFooter } from "@/components/ui/dialog";
import React from "react";

const expenseEditorSchemaBase = z.object({
  id: z.string().optional(),
  date: z.date({ required_error: "Expense date is required." }),
  description: z.string().min(2, "Description must be at least 2 characters."),
  category: z.enum(ALL_EXPENSE_CATEGORIES, { required_error: "Category is required." }),
  amount: z.coerce.number().min(0.01, `Amount (in ${BASE_CURRENCY_CODE}) must be greater than 0.`).default(0),
  notes: z.string().optional(),
  receiptUrl: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal("")),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(ALL_RECURRENCE_TYPES).optional(),
  recurrenceEndDate: z.date().optional().nullable(),
});

const expenseEditorSchema = expenseEditorSchemaBase.refine(data => {
    if (data.isRecurring && !data.recurrenceType) {
        return false; // recurrenceType is required if isRecurring is true
    }
    return true;
}, {
    message: "Recurrence type is required if expense is recurring.",
    path: ["recurrenceType"],
}).refine(data => {
    if (data.isRecurring && data.recurrenceType && data.recurrenceEndDate && data.recurrenceEndDate < data.date) {
        return false; // recurrenceEndDate must be after or same as expense date
    }
    return true;
}, {
    message: "Recurrence end date must be on or after the expense date.",
    path: ["recurrenceEndDate"],
});


export type ExpenseEditorValues = z.infer<typeof expenseEditorSchema>;

interface ExpenseEditorProps {
  expense?: Partial<Expense>;
  onSave: (data: Expense) => void;
  onClose: () => void;
}

export const ExpenseEditor: React.FC<ExpenseEditorProps> = ({ expense, onSave, onClose }) => {
  const form = useForm<ExpenseEditorValues>({
    resolver: zodResolver(expenseEditorSchema),
    defaultValues: {
      id: expense?.id || "",
      date: expense?.date ? parseISO(expense.date) : new Date(),
      description: expense?.description || "",
      category: expense?.category || ALL_EXPENSE_CATEGORIES[0],
      amount: expense?.amount || 0,
      notes: expense?.notes || "",
      receiptUrl: expense?.receiptUrl || "",
      isRecurring: expense?.isRecurring || false,
      recurrenceType: expense?.recurrenceType || undefined,
      recurrenceEndDate: expense?.recurrenceEndDate ? parseISO(expense.recurrenceEndDate) : undefined,
    },
  });

  const isRecurringWatcher = form.watch("isRecurring");

  function onSubmit(data: ExpenseEditorValues) {
    const finalData: Expense = {
      id: data.id || crypto.randomUUID(),
      date: data.date.toISOString(),
      description: data.description,
      category: data.category,
      amount: data.amount,
      notes: data.notes,
      receiptUrl: data.receiptUrl,
      isRecurring: data.isRecurring,
      recurrenceType: data.isRecurring ? data.recurrenceType : undefined,
      recurrenceEndDate: data.isRecurring && data.recurrenceEndDate ? data.recurrenceEndDate.toISOString() : undefined,
    };
    onSave(finalData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField control={form.control} name="id" render={({ field }) => ( <FormItem><FormLabel className="sr-only">ID</FormLabel><FormControl><Input type="hidden" {...field} /></FormControl></FormItem>)} />
        
        <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Date *</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage />
            </FormItem>
        )}/>
        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description *</FormLabel><FormControl><Input placeholder="e.g., Office Lunch, Software Subscription" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl><SelectContent>{ALL_EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount ({BASE_CURRENCY_CODE}) *</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 25.50" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any additional details..." {...field} rows={2} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="receiptUrl" render={({ field }) => (
            <FormItem><FormLabel>Receipt URL (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://example.com/receipt.pdf" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <FormField control={form.control} name="isRecurring" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Is Recurring?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
        )}/>
        {isRecurringWatcher && (
            <div className="space-y-4 p-3 border rounded-md bg-muted/50">
                <FormField control={form.control} name="recurrenceType" render={({ field }) => (
                    <FormItem><FormLabel>Recurrence Type *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select recurrence type" /></SelectTrigger></FormControl><SelectContent>{ALL_RECURRENCE_TYPES.map(rt => <SelectItem key={rt} value={rt} className="capitalize">{rt}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="recurrenceEndDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Recurrence End Date (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Leave blank for indefinite</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={(date) => date < form.getValues("date")} initialFocus /></PopoverContent></Popover><FormMessage />
                    </FormItem>
                )}/>
            </div>
        )}
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{expense?.id ? "Save Changes" : "Add Expense"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
