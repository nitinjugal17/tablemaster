
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
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Menu, MenuItem as MenuItemType, Outlet } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { getOutlets } from "@/app/actions/data-management-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Helper to safely parse the menuItemIds array
const getMenuItemIdsArray = (ids: string[] | string | undefined): string[] => {
    if (Array.isArray(ids)) {
        return ids;
    }
    if (typeof ids === 'string' && ids.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(ids);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse menuItemIds string:", ids, e);
            return [];
        }
    }
    // Handle comma-separated strings as well
    if(typeof ids === 'string' && ids.length > 0) {
        return ids.split(',').map(id => id.trim()).filter(Boolean);
    }
    return [];
};


const menuEditorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Menu name is required."),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  outletId: z.string().optional(),
  menuItemIds: z.array(z.string()).min(1, "At least one menu item must be selected."),
});

type MenuEditorValues = z.infer<typeof menuEditorSchema>;

interface MenuEditorProps {
  menu?: Partial<Menu>;
  allMenuItems: MenuItemType[];
  onSave: (data: Menu) => void;
  onClose: () => void;
}

export const MenuEditor: React.FC<MenuEditorProps> = ({ menu, allMenuItems, onSave, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchOutlets() {
        try {
            const fetchedOutlets = await getOutlets();
            setOutlets(fetchedOutlets);
        } catch (error) {
            toast({ title: "Error", description: "Could not load outlets.", variant: "destructive" });
        }
    }
    fetchOutlets();
  }, [toast]);

  const form = useForm<MenuEditorValues>({
    resolver: zodResolver(menuEditorSchema),
    defaultValues: {
      id: menu?.id || "",
      name: menu?.name || "",
      description: menu?.description || "",
      isActive: menu?.isActive === undefined ? true : menu.isActive,
      outletId: menu?.outletId || "__NONE__",
      menuItemIds: getMenuItemIdsArray(menu?.menuItemIds) || [],
    },
  });

  function onSubmit(data: MenuEditorValues) {
    const finalData: Menu = {
      id: data.id || "", // ID will be set by the parent saving logic if it's new
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      outletId: data.outletId === '__NONE__' ? undefined : data.outletId, // Handle placeholder value
      menuItemIds: data.menuItemIds,
    };
    onSave(finalData);
  }

  const filteredMenuItems = allMenuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl text-primary">
          {menu?.id ? `Edit Menu: ${menu.name}` : "Create New Menu"}
        </DialogTitle>
        <DialogDescription>
          Organize your items into menus like "Lunch" or "Dinner". Select which items should appear on this menu.
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
                    <FormLabel>Menu Name *</FormLabel>
                    <FormControl><Input placeholder="e.g., Dinner Menu" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="e.g., Available from 5 PM to 10 PM." {...field} rows={2} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="outletId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Outlet (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "__NONE__"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select an outlet" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="__NONE__">None (Global Menu)</SelectItem>
                            {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormDescription>Link this menu to a specific F&B outlet.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Is Active</FormLabel>
                      <FormDescription>
                        Active menus can be displayed on the public site.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="menuItemIds"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Menu Items *</FormLabel>
                      <FormDescription>
                        Select the items that belong to this menu.
                      </FormDescription>
                    </div>
                    <Input
                      placeholder="Search items to include..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="mb-2"
                    />
                    <ScrollArea className="h-48 rounded-md border p-4">
                      {filteredMenuItems.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="menuItemIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0 py-1"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item.name}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      {filteredMenuItems.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground">No items match your search.</p>
                      )}
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{menu?.id ? "Save Changes" : "Create Menu"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};
