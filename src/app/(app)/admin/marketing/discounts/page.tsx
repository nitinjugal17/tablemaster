
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Tag, PlusCircle, Edit3, Trash2, Loader2, Save, MoreVertical, Percent, BadgeDollarSign, CalendarDays, CheckCircle, XCircle, Building } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader as AlertDialogHeaderComponent,
  AlertDialogFooter as AlertDialogFooterComponent,
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
import { Table, TableBody, TableCell, TableHead, TableHeader as TableHeaderComponent, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { DiscountCode, DiscountCodeType, Outlet } from "@/lib/types";
import { BASE_CURRENCY_CODE } from "@/lib/types";
import { getDiscounts, saveDiscounts as saveDiscountsAction, getOutlets } from "@/app/actions/data-management-actions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { format, parseISO, isValid } from 'date-fns';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";


const discountCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3, "Code must be at least 3 characters long.").regex(/^[A-Z0-9]+$/, "Code can only contain uppercase letters and numbers."),
  type: z.enum(['percentage', 'fixed_amount'], { required_error: "Discount type is required." }),
  value: z.coerce.number().min(0.01, "Value must be greater than 0."),
  imageUrl: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal("")),
  aiHint: z.string().optional().refine(val => !val || val.split(' ').length <= 2, { message: "AI Hint can be max 2 words." }),
  validFrom: z.date({ required_error: "Valid from date is required." }),
  validTo: z.date({ required_error: "Valid to date is required." }),
  usageLimit: z.coerce.number().min(0, "Usage limit cannot be negative (0 for unlimited).").optional().default(0),
  minOrderAmount: z.coerce.number().min(0, "Minimum order amount cannot be negative.").optional().default(0),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
  outletId: z.string().optional(),
}).refine(data => {
    if (data.validFrom && data.validTo) {
        return data.validTo >= data.validFrom;
    }
    return true;
}, {
  message: "Valid 'to' date must be after or same as 'from' date.",
  path: ["validTo"],
});

type DiscountFormValues = z.infer<typeof discountCodeSchema>;

interface DiscountEditorProps {
  discount?: Partial<DiscountCode>;
  onSave: (data: DiscountCode) => void;
  onClose: () => void;
  existingCodes: string[];
  outlets: Outlet[];
}

const DiscountEditor: React.FC<DiscountEditorProps> = ({ discount, onSave, onClose, existingCodes, outlets }) => {
    
  const formSchemaWithUniqueness = useMemo(() => {
    return discountCodeSchema.refine((data) => {
        const currentCode = data.code.toUpperCase();
        const otherCodes = existingCodes.filter(c => c.toLowerCase() !== discount?.code?.toLowerCase());
        return !otherCodes.some(c => c.toLowerCase() === currentCode.toLowerCase());
    }, {
        message: "This discount code already exists.",
        path: ["code"],
    });
  }, [existingCodes, discount, discountCodeSchema]);

  const parseDateSafe = (dateString?: string): Date | undefined => {
    if (!dateString) return undefined;
    const date = parseISO(dateString);
    return isValid(date) ? date : undefined;
  };
    
  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(formSchemaWithUniqueness),
    defaultValues: {
      id: discount?.id || "",
      code: discount?.code || "",
      type: discount?.type || "percentage",
      value: discount?.value || 0,
      imageUrl: discount?.imageUrl || "",
      aiHint: discount?.aiHint || "",
      validFrom: parseDateSafe(discount?.validFrom) || new Date(),
      validTo: parseDateSafe(discount?.validTo) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      usageLimit: discount?.usageLimit || 0,
      minOrderAmount: discount?.minOrderAmount || 0,
      isActive: discount?.isActive === undefined ? true : discount.isActive,
      description: discount?.description || "",
      outletId: discount?.outletId || "__NONE__",
    },
  });

  function onSubmit(data: DiscountFormValues) {
    const finalData: DiscountCode = {
      id: data.id || crypto.randomUUID(),
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.value,
      imageUrl: data.imageUrl || undefined,
      aiHint: data.aiHint || undefined,
      validFrom: data.validFrom.toISOString(),
      validTo: data.validTo.toISOString(),
      usageLimit: data.usageLimit || 0,
      timesUsed: discount?.timesUsed || 0, // Preserve timesUsed
      minOrderAmount: data.minOrderAmount || 0,
      isActive: data.isActive,
      description: data.description || "",
      outletId: data.outletId === "__NONE__" ? undefined : data.outletId,
    };
    onSave(finalData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField control={form.control} name="code" render={({ field }) => (
          <FormItem>
            <FormLabel>Discount Code *</FormLabel>
            <FormControl><Input placeholder="e.g., SUMMER25" {...field} disabled={!!discount?.id} /></FormControl>
            <FormDescription>Uppercase letters & numbers. Cannot be changed after creation.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount ({BASE_CURRENCY_CODE})</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="value" render={({ field }) => (
            <FormItem>
              <FormLabel>Value *</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder="e.g., 10 or 100" {...field} /></FormControl>
              <FormDescription>{form.watch("type") === "percentage" ? "Percentage (e.g., 10 for 10%)" : `Amount in ${BASE_CURRENCY_CODE}`}</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="outletId" render={({ field }) => (
            <FormItem>
              <FormLabel>Assign to Outlet (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "__NONE__"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="All Outlets" /></SelectTrigger></FormControl>
                  <SelectContent>
                      <SelectItem value="__NONE__">All Outlets</SelectItem>
                      {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
              </Select>
              <FormDescription>Make this discount code valid only for a specific outlet.</FormDescription>
              <FormMessage />
            </FormItem>
        )}/>
         <FormField control={form.control} name="imageUrl" render={({ field }) => (
          <FormItem><FormLabel>Image URL (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://example.com/discount.png" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="aiHint" render={({ field }) => (
          <FormItem><FormLabel>AI Image Hint (Optional)</FormLabel><FormControl><Input placeholder="e.g., percent off" {...field} /></FormControl><FormDescription className="text-xs">Keywords for Unsplash/AI image generation.</FormDescription><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="validFrom" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Valid From *</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value && isValid(field.value) ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent></Popover><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="validTo" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Valid To *</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value && isValid(field.value) ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={date => date < form.watch("validFrom")} initialFocus /></PopoverContent></Popover><FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="usageLimit" render={({ field }) => (
            <FormItem>
              <FormLabel>Usage Limit</FormLabel>
              <FormControl><Input type="number" min="0" placeholder="0 for unlimited" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="minOrderAmount" render={({ field }) => (
            <FormItem>
              <FormLabel>Min. Order Amount ({BASE_CURRENCY_CODE})</FormLabel>
              <FormControl><Input type="number" min="0" placeholder="0 for no minimum" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description (Optional)</FormLabel>
            <FormControl><Textarea placeholder="e.g., Special weekend offer" {...field} rows={2} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="isActive" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Active</FormLabel><FormDescription>Enable this discount code.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
        )} />
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{discount?.id ? "Save Changes" : "Create Discount"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default function DiscountManagementPage() {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Partial<DiscountCode> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const existingCodes = useMemo(() => discounts.map(d => d.code.toUpperCase()), [discounts]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedDiscounts, fetchedOutlets] = await Promise.all([
          getDiscounts(),
          getOutlets()
      ]);
      setDiscounts(fetchedDiscounts);
      setOutlets(fetchedOutlets);
    } catch (error) {
      toast({ title: "Error", description: "Could not load discount codes or outlets.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveDiscount = (data: DiscountCode) => {
    setDiscounts(prev => {
      const existingIndex = prev.findIndex(d => d.id === data.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated;
      }
      return [...prev, data];
    });
    toast({ title: "Discount Saved Locally", description: `Discount "${data.code}" ${data.id === editingDiscount?.id ? 'updated' : 'added'}. Save all to persist.` });
    setIsEditorOpen(false);
    setEditingDiscount(undefined);
  };

  const handleOpenEditor = (discount?: DiscountCode) => {
    setEditingDiscount(discount);
    setIsEditorOpen(true);
  };

  const handleDeleteDiscount = (id: string) => {
    setDiscounts(prev => prev.filter(d => d.id !== id));
    toast({ title: "Discount Deleted Locally", description: "Save all changes to persist this deletion.", variant: "destructive" });
  };

  const handleSaveAllToCsv = async () => {
    setIsSaving(true);
    try {
      const result = await saveDiscountsAction(discounts);
      if (result.success) {
        toast({ title: "Discounts Saved", description: "All discount code changes have been saved to CSV." });
        await fetchData(); // Refresh data from source
      } else {
        toast({ title: "Error Saving Discounts", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save discount codes.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getValidityString = (from: string, to: string): string => {
    try {
      const fromDate = isValid(parseISO(from)) ? format(parseISO(from), 'MMM d, yy') : 'Invalid';
      const toDate = isValid(parseISO(to)) ? format(parseISO(to), 'MMM d, yy') : 'Invalid';
      return `${fromDate} - ${toDate}`;
    } catch { return "Invalid Dates"; }
  };


  return (
    <div className="space-y-8">
       <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setEditingDiscount(undefined);}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {editingDiscount?.id ? `Edit Discount: ${editingDiscount.code}` : "Create New Discount Code"}
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && (
            <DiscountEditor 
              discount={editingDiscount} 
              onSave={handleSaveDiscount} 
              onClose={() => setIsEditorOpen(false)}
              existingCodes={existingCodes}
              outlets={outlets}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <Tag className="mr-3 h-7 w-7" /> Discount Code Management
            </h1>
            <p className="text-muted-foreground">Create, edit, delete, and manage discount codes.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => handleOpenEditor()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Discount
            </Button>
            <Button onClick={handleSaveAllToCsv} disabled={isSaving || isLoading}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save All to CSV
            </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">Existing Discount Codes ({discounts.length})</CardTitle>
          <CardDescription>Changes are local until "Save All to CSV" is clicked.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading discounts...</span></div>
          ) : discounts.length > 0 ? (
            <Table>
              <TableHeaderComponent>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type / Value</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeaderComponent>
              <TableBody>
                {discounts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-semibold text-primary">{d.code}</TableCell>
                    <TableCell>
                      <Badge variant={d.type === 'percentage' ? 'secondary' : 'outline'} className="capitalize flex items-center gap-1 w-fit">
                        {d.type === 'percentage' ? <Percent className="h-3 w-3"/> : <BadgeDollarSign className="h-3 w-3"/>}
                        {d.type.replace('_', ' ')}: {d.value}{d.type === 'percentage' ? '%' : ` ${BASE_CURRENCY_CODE}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{getValidityString(d.validFrom, d.validTo)}</TableCell>
                    <TableCell className="text-xs">
                      {d.usageLimit > 0 ? `${d.timesUsed} / ${d.usageLimit}` : `${d.timesUsed} / ∞`}
                    </TableCell>
                     <TableCell className="text-xs">
                      {d.outletId ? outlets.find(o => o.id === d.outletId)?.name || d.outletId : 'All'}
                    </TableCell>
                    <TableCell>
                      {d.isActive ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditor(d)}><Edit3 className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeaderComponent><AlertDialogTitleComponent>Delete Discount "{d.code}"?</AlertDialogTitleComponent>
                                <AlertDialogDescription>This will mark the discount for deletion. Save all changes to CSV to make it permanent.</AlertDialogDescription>
                              </AlertDialogHeaderComponent>
                              <AlertDialogFooterComponent><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteDiscount(d.id)}>Delete Locally</AlertDialogAction></AlertDialogFooterComponent>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-10">No discount codes created yet. Click "Add New Discount" to start.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
