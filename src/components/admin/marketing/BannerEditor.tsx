
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
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, Link as LinkIcon } from "lucide-react"; // Renamed Link to LinkIcon
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import type { Banner } from "@/lib/types";
import { DialogFooter } from "@/components/ui/dialog"; // Use local import for DialogFooter
import React from "react";
import NextImage from 'next/image';

const bannerEditorSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters."),
  imageUrl: z.string().url({ message: "Valid image URL is required." }).min(1, "Image URL cannot be empty."),
  aiHint: z.string().optional().refine(val => !val || val.split(' ').length <= 2, { message: "AI Hint can be max 2 words." }),
  linkUrl: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal("")),
  displayOrder: z.coerce.number().min(0, "Display order cannot be negative.").default(0),
  isActive: z.boolean().default(true),
  validFrom: z.date().optional().nullable(),
  validTo: z.date().optional().nullable(),
}).refine(data => {
    if (data.validFrom && data.validTo && data.validTo < data.validFrom) {
        return false;
    }
    return true;
}, { message: "Valid 'to' date must be after or same as 'from' date.", path: ["validTo"] });

type BannerFormValues = z.infer<typeof bannerEditorSchema>;

interface BannerEditorProps {
  banner?: Partial<Banner>;
  onSave: (data: Banner) => void;
  onClose: () => void;
  existingBannerTitles: string[];
}

export const BannerEditor: React.FC<BannerEditorProps> = ({ banner, onSave, onClose, existingBannerTitles }) => {
  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerEditorSchema.refine(data => {
      const isTitleDuplicate =
        (!banner?.id && existingBannerTitles.map(t => t.toLowerCase()).includes(data.title.toLowerCase())) ||
        (banner?.id && existingBannerTitles.filter(t => t.toLowerCase() !== banner.title?.toLowerCase()).map(t => t.toLowerCase()).includes(data.title.toLowerCase()));
      return !isTitleDuplicate;
    }, { message: "A banner with this title already exists.", path: ["title"] })),
    defaultValues: {
      id: banner?.id || "",
      title: banner?.title || "",
      imageUrl: banner?.imageUrl || "",
      aiHint: banner?.aiHint || "",
      linkUrl: banner?.linkUrl || "",
      displayOrder: banner?.displayOrder || 0,
      isActive: banner?.isActive === undefined ? true : banner.isActive,
      validFrom: banner?.validFrom ? parseISO(banner.validFrom) : null,
      validTo: banner?.validTo ? parseISO(banner.validTo) : null,
    },
  });

  function onSubmit(data: BannerFormValues) {
    const finalData: Banner = {
      id: data.id || crypto.randomUUID(),
      title: data.title,
      imageUrl: data.imageUrl,
      aiHint: data.aiHint || undefined,
      linkUrl: data.linkUrl || undefined,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
      validFrom: data.validFrom ? data.validFrom.toISOString() : undefined,
      validTo: data.validTo ? data.validTo.toISOString() : undefined,
    };
    onSave(finalData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="e.g., Summer Sale" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="imageUrl" render={({ field }) => (
          <FormItem><FormLabel>Image URL *</FormLabel>
             <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground"/>
                <FormControl><Input type="url" placeholder="https://example.com/banner.png" {...field} /></FormControl>
             </div>
             {form.watch("imageUrl") && (
                <div className="mt-2 w-full aspect-[4/1] max-h-32 relative border rounded-md overflow-hidden bg-muted/30">
                    <NextImage src={form.watch("imageUrl")} alt="Banner Preview" layout="fill" objectFit="contain" />
                </div>
             )}
          <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="aiHint" render={({ field }) => (
          <FormItem><FormLabel>AI Hint (Optional)</FormLabel><FormControl><Input placeholder="e.g., food promotion (max 2 words)" {...field} /></FormControl><FormDescription className="text-xs">Keywords for Unsplash or AI image generation (max 2 words).</FormDescription><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="linkUrl" render={({ field }) => (
          <FormItem><FormLabel>Link URL (Optional)</FormLabel>
           <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground"/>
              <FormControl><Input type="url" placeholder="https://example.com/offer-page" {...field} /></FormControl>
           </div>
          <FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="displayOrder" render={({ field }) => (
            <FormItem><FormLabel>Display Order</FormLabel><FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl><FormDescription className="text-xs">Lower numbers appear first.</FormDescription><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="isActive" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4 md:mt-0"><div className="space-y-0.5"><FormLabel>Active</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
            )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="validFrom" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Valid From (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "PPP") : <span>Pick start date</span>} <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="validTo" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Valid To (Optional)</FormLabel><Popover><PopoverTrigger asChild><FormControl>
                <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                  {field.value ? format(field.value, "PPP") : <span>Pick end date</span>} <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={(date) => form.getValues("validFrom") ? date < form.getValues("validFrom")! : false} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
          )} />
        </div>
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{banner?.id ? "Save Changes" : "Create Banner"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
