
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { CalendarDays, Link as LinkIconLucide } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from 'date-fns';
import type { Offer, OfferType } from '@/lib/types';
import { ALL_OFFER_TYPES } from '@/lib/types';
import { DialogFooter } from "@/components/ui/dialog";

const offerFormSchemaDefinition = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters long."),
  description: z.string().optional(),
  type: z.enum(ALL_OFFER_TYPES),
  details: z.string().optional(),
  imageUrl: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal("")),
  aiHint: z.string().optional().refine(val => !val || val.split(' ').length <= 2, { message: "AI Hint can be max 2 words." }),
  validFrom: z.date({ required_error: "Valid from date is required." }),
  validTo: z.date({ required_error: "Valid to date is required." }),
  isActive: z.boolean().default(true),
  linkedMenuItemIds: z.string().optional(),
}).refine(data => {
    if (data.validFrom && data.validTo) {
        return data.validTo >= data.validFrom;
    }
    return true;
}, {
  message: "Valid 'to' date must be after or same as 'from' date.",
  path: ["validTo"],
});

type OfferFormValues = z.infer<typeof offerFormSchemaDefinition>;

interface MarketingOfferEditorFormProps {
  offer?: Partial<Offer>;
  onSave: (data: Offer) => void;
  onClose: () => void;
  existingOfferTitles: string[];
}

export const OfferEditorForm: React.FC<MarketingOfferEditorFormProps> = ({ offer, onSave, onClose, existingOfferTitles }) => {
  const formSchemaWithUniqueness = offerFormSchemaDefinition.refine(data => {
    const isTitleDuplicate =
      (!offer?.id && existingOfferTitles.some(t => t.toLowerCase() === data.title.toLowerCase())) ||
      (offer?.id && existingOfferTitles.filter(t => t.toLowerCase() !== offer.title?.toLowerCase()).map(t => t.toLowerCase()).includes(data.title.toLowerCase()));
    return !isTitleDuplicate;
  }, { message: "An offer with this title already exists.", path: ["title"] });

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(formSchemaWithUniqueness),
    defaultValues: {
      id: offer?.id || "",
      title: offer?.title || "",
      description: offer?.description || "",
      type: offer?.type || ALL_OFFER_TYPES[0],
      details: offer?.details || "{}",
      imageUrl: offer?.imageUrl || "",
      aiHint: offer?.aiHint || "",
      validFrom: offer?.validFrom ? parseISO(offer.validFrom) : new Date(),
      validTo: offer?.validTo ? parseISO(offer.validTo) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: offer?.isActive === undefined ? true : offer.isActive,
      linkedMenuItemIds: offer?.linkedMenuItemIds || "",
    },
  });

  function onSubmit(data: OfferFormValues) {
    let finalDetails = data.details?.trim();
    if (finalDetails) {
      try {
        JSON.parse(finalDetails);
      } catch (e) {
        form.setError("details", { message: "Details field contains invalid JSON." });
        return;
      }
    } else {
      finalDetails = "{}";
    }

    const finalData: Offer = {
      id: data.id || crypto.randomUUID(),
      title: data.title,
      description: data.description || undefined,
      type: data.type,
      details: finalDetails,
      imageUrl: data.imageUrl || undefined,
      aiHint: data.aiHint || undefined,
      validFrom: data.validFrom.toISOString(),
      validTo: data.validTo.toISOString(),
      isActive: data.isActive,
      linkedMenuItemIds: data.linkedMenuItemIds || undefined,
    };
    onSave(finalData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="e.g., Weekend Bonanza" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Describe the offer..." {...field} rows={2} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem><FormLabel>Type *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl><SelectTrigger><SelectValue placeholder="Select offer type" /></SelectTrigger></FormControl>
            <SelectContent>{ALL_OFFER_TYPES.map(type => <SelectItem key={type} value={type} className="capitalize">{type.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="details" render={({ field }) => (
          <FormItem><FormLabel>Details (JSON String)</FormLabel><FormControl><Textarea placeholder='e.g., {"itemId": "menu-item-id", "discountPercent": 10} or empty/{}' {...field} rows={3} /></FormControl>
            <FormDescription className="text-xs">
              Must be valid JSON or empty/placeholder {'{}'}. Examples:
              <br />
              <code>{'discount_on_item: \'{"menuItemId": "xyz", "discountPercent": 10}\''}</code>
              <br />
              <code>{'combo_deal: \'{"itemIds": ["abc", "def"], "comboPrice": 20.00}\''}</code>
              <br />
              <code>{'free_item_with_purchase: \'{"requiredItemId": "ghi", "freeItemId": "jkl"}\''}</code>
            </FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="validFrom" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Valid From *</FormLabel><Popover><PopoverTrigger asChild><FormControl>
              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                {field.value && isValid(field.value) ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
              </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="validTo" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Valid To *</FormLabel><Popover><PopoverTrigger asChild><FormControl>
              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                {field.value && isValid(field.value) ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
              </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date: Date) => form.getValues("validFrom") ? date < form.getValues("validFrom") : false} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="imageUrl" render={({ field }) => (
          <FormItem><FormLabel>Image URL (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://example.com/offer-image.png" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="aiHint" render={({ field }) => (
          <FormItem><FormLabel>AI Image Hint (Optional)</FormLabel><FormControl><Input placeholder="e.g., food discount" {...field} /></FormControl><FormDescription className="text-xs">Keywords for Unsplash/AI image generation.</FormDescription><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="linkedMenuItemIds" render={({ field }) => (
          <FormItem><FormLabel>Linked Menu Item IDs (Optional)</FormLabel><FormControl><Textarea placeholder="item-id-1,item-id-2" {...field} rows={2} /></FormControl><FormDescription className="text-xs">Comma-separated list of menu item IDs this offer applies to.</FormDescription><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="isActive" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Active</FormLabel><FormDescription>Enable this offer.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
        )} />
        <DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">{offer?.id ? "Save Changes" : "Create Offer"}</Button></DialogFooter>
      </form>
    </Form>
  );
};
