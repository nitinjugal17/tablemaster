
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Outlet, OutletType } from '@/lib/types';
import { ALL_OUTLET_TYPES } from '@/lib/types';
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const outletFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Outlet name is required."),
  type: z.enum(ALL_OUTLET_TYPES),
  description: z.string().optional(),
});

type OutletFormValues = z.infer<typeof outletFormSchema>;

interface OutletEditorProps {
  outlet?: Partial<Outlet>;
  onSave: (data: Outlet) => void;
  onClose: () => void;
}

export const OutletEditor: React.FC<OutletEditorProps> = ({ outlet, onSave, onClose }) => {
  const form = useForm<OutletFormValues>({
    resolver: zodResolver(outletFormSchema),
    defaultValues: {
      id: outlet?.id || "",
      name: outlet?.name || "",
      type: outlet?.type || 'restaurant',
      description: outlet?.description || "",
    },
  });

  function onSubmit(data: OutletFormValues) {
    const finalData: Outlet = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      type: data.type,
      description: data.description,
    };
    onSave(finalData);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl text-primary">
          {outlet?.id ? `Edit Outlet: ${outlet.name}` : "Create New Outlet"}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Outlet Name *</FormLabel><FormControl><Input placeholder="e.g., Main Restaurant, Rooftop Bar" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem><FormLabel>Outlet Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{ALL_OUTLET_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select><FormMessage />
            </FormItem>
          )}/>
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A brief description of the outlet." {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save Outlet</Button></DialogFooter>
        </form>
      </Form>
    </>
  );
};
