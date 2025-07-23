
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AddonGroup, Addon } from "@/lib/types";
import { BASE_CURRENCY_CODE } from "@/lib/types";
import { PlusCircle, Trash2 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

// Helper to safely parse the addons array
const getAddonsArray = (addons: Addon[] | string | undefined): Addon[] => {
    if (Array.isArray(addons)) {
        return addons;
    }
    if (typeof addons === 'string' && addons.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(addons);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse addons string:", addons, e);
            return [];
        }
    }
    return [];
};


const addonSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Add-on name is required."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
});

const addonGroupEditorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Group name is required."),
  description: z.string().optional(),
  addons: z.array(addonSchema).min(1, "At least one add-on option is required."),
});

type AddonGroupEditorValues = z.infer<typeof addonGroupEditorSchema>;

interface AddonGroupEditorProps {
  addonGroup?: AddonGroup;
  onSave: (data: AddonGroup) => void;
  onClose: () => void;
}

export const AddonGroupEditor: React.FC<AddonGroupEditorProps> = ({ addonGroup, onSave, onClose }) => {
  const { currencySymbol, convertPrice } = useCurrency();

  const form = useForm<AddonGroupEditorValues>({
    resolver: zodResolver(addonGroupEditorSchema),
    defaultValues: {
      id: addonGroup?.id || "",
      name: addonGroup?.name || "",
      description: addonGroup?.description || "",
      addons: getAddonsArray(addonGroup?.addons).length > 0 ? getAddonsArray(addonGroup?.addons) : [{ id: crypto.randomUUID(), name: "", price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "addons",
  });

  function onSubmit(data: AddonGroupEditorValues) {
    const finalData: AddonGroup = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      description: data.description,
      addons: data.addons,
    };
    onSave(finalData);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl text-primary">
          {addonGroup ? `Edit Add-on Group: ${addonGroup.name}` : "Create New Add-on Group"}
        </DialogTitle>
        <DialogDescription>
          Add-on groups allow you to offer customizations for menu items, like "Extra Toppings" or "Side Choices".
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ScrollArea className="max-h-[60vh] p-1 pr-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name *</FormLabel>
                    <FormControl><Input placeholder="e.g., Extra Toppings" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Additional toppings for your pizza." {...field} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Add-on Options *</FormLabel>
                <div className="space-y-3 pt-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md bg-muted/50">
                      <div className="grid grid-cols-2 gap-2 flex-grow">
                          <FormField
                            control={form.control}
                            name={`addons.${index}.name`}
                            render={({ field: nameField }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Option Name</FormLabel>
                                <FormControl><Input placeholder="e.g., Extra Cheese" {...nameField} className="h-9" /></FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`addons.${index}.price`}
                            render={({ field: priceField }) => (
                               <FormItem>
                                <FormLabel className="text-xs">Price ({BASE_CURRENCY_CODE})</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="e.g., 1.50" {...priceField} className="h-9" /></FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => remove(index)} disabled={fields.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                   <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => append({ id: crypto.randomUUID(), name: '', price: 0 })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                    </Button>
                </div>
                 <FormField
                    control={form.control}
                    name="addons"
                    render={() => <FormMessage className="mt-2" />}
                  />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{addonGroup ? "Save Changes" : "Create Group"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
