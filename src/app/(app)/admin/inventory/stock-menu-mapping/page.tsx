
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { StockMenuMapping, StockItem, MenuItem as MenuItemType, StockUnit } from "@/lib/types";
import { ALL_STOCK_UNITS } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Link2 as LinkIcon, PlusCircle, Edit3, Trash2, ListFilter, Loader2, MoreVertical, Save, PackageSearch } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getStockMenuMappings, saveStockMenuMappings as saveMappingsAction, getStockItems, getMenuItems } from "@/app/actions/data-management-actions";
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
import { ScrollArea } from '@/components/ui/scroll-area';

const mappingEditorSchema = z.object({
  id: z.string().optional(),
  menuItemId: z.string().min(1, "Menu Item is required."),
  stockItemId: z.string().min(1, "Stock Item is required."),
  quantityUsedPerServing: z.coerce.number().min(0.001, "Quantity must be greater than 0."),
  unitUsed: z.enum(ALL_STOCK_UNITS as [StockUnit, ...StockUnit[]], { required_error: "Unit used is required." }),
});

type MappingEditorValues = z.infer<typeof mappingEditorSchema>;

interface MappingEditorProps {
  mapping?: Partial<StockMenuMapping>;
  allStockItems: StockItem[];
  allMenuItems: MenuItemType[];
  existingMappings: StockMenuMapping[];
  onSave: (data: StockMenuMapping) => void;
  onClose: () => void;
}

const MappingEditor: React.FC<MappingEditorProps> = ({ mapping, allStockItems, allMenuItems, existingMappings, onSave, onClose }) => {
  const form = useForm<MappingEditorValues>({
    resolver: zodResolver(mappingEditorSchema.refine(data => {
        // Check for duplicate mapping (same stock item to same menu item)
        const isDuplicate = existingMappings.some(em => 
            em.menuItemId === data.menuItemId && 
            em.stockItemId === data.stockItemId &&
            em.id !== data.id // Allow editing the current mapping
        );
        return !isDuplicate;
    }, { message: "This stock item is already mapped to this menu item.", path: ["stockItemId"]})),
    defaultValues: {
      id: mapping?.id || "",
      menuItemId: mapping?.menuItemId || "",
      stockItemId: mapping?.stockItemId || "",
      quantityUsedPerServing: mapping?.quantityUsedPerServing || 1,
      unitUsed: mapping?.unitUsed || allStockItems.find(si => si.id === mapping?.stockItemId)?.unit || ALL_STOCK_UNITS[0],
    },
  });

  useEffect(() => {
    // When stock item changes, update unitUsed to match stock item's unit by default
    const stockItemId = form.watch("stockItemId");
    const selectedStockItem = allStockItems.find(si => si.id === stockItemId);
    if (selectedStockItem) {
      form.setValue("unitUsed", selectedStockItem.unit);
    }
  }, [form.watch("stockItemId"), allStockItems, form]);


  function onSubmit(data: MappingEditorValues) {
    const finalData: StockMenuMapping = {
      id: data.id || crypto.randomUUID(),
      menuItemId: data.menuItemId,
      stockItemId: data.stockItemId,
      quantityUsedPerServing: data.quantityUsedPerServing,
      unitUsed: data.unitUsed,
    };
    onSave(finalData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
        <FormField
          control={form.control}
          name="menuItemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Menu Item *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!mapping?.id}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select menu item" /></SelectTrigger></FormControl>
                <SelectContent>
                  {allMenuItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormDescription>Cannot be changed after creation.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stockItemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Item *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!mapping?.id}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select stock item" /></SelectTrigger></FormControl>
                <SelectContent>
                  {allStockItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name} ({item.unit})</SelectItem>)}
                </SelectContent>
              </Select>
              <FormDescription>Cannot be changed after creation.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="quantityUsedPerServing"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity Used Per Serving *</FormLabel>
              <FormControl><Input type="number" step="any" min="0.001" placeholder="e.g., 0.25" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unitUsed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Used *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                <SelectContent>
                  {ALL_STOCK_UNITS.map(u => <SelectItem key={u} value={u} className="capitalize">{u}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormDescription>Should align with the stock item's unit or be convertible.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{mapping?.id ? "Save Changes" : "Add Mapping"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};


export default function StockMenuMappingPage() {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<StockMenuMapping[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Partial<StockMenuMapping> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMenuItem, setFilterMenuItem] = useState('all');
  const [filterStockItem, setFilterStockItem] = useState('all');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [fetchedMappings, fetchedStockItems, fetchedMenuItems] = await Promise.all([
          getStockMenuMappings(),
          getStockItems(),
          getMenuItems()
        ]);
        setMappings(fetchedMappings);
        setStockItems(fetchedStockItems);
        setMenuItems(fetchedMenuItems);
      } catch (error) {
        toast({ title: "Error", description: "Could not load mappings, stock, or menu items.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleSaveMapping = (data: StockMenuMapping) => {
    setMappings(prev => {
      const existingIndex = prev.findIndex(item => item.id === data.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated;
      }
      return [...prev, data];
    });
    toast({ title: "Mapping Saved Locally", description: `Mapping ${data.id === editingMapping?.id ? 'updated' : 'added'}. Save all to persist.` });
    setIsEditorOpen(false);
    setEditingMapping(undefined);
  };

  const handleOpenEditor = (mapping?: StockMenuMapping) => {
    setEditingMapping(mapping);
    setIsEditorOpen(true);
  };

  const handleDeleteMapping = (id: string) => {
    setMappings(prev => prev.filter(item => item.id !== id));
    toast({ title: "Mapping Deleted Locally", description: "Save all changes to persist this deletion.", variant: "destructive" });
  };

  const handleSaveAllToCsv = async () => {
    setIsSaving(true);
    try {
      const result = await saveMappingsAction(mappings);
      if (result.success) {
        toast({ title: "Mappings Saved", description: "All stock-menu mappings have been saved to CSV." });
      } else {
        toast({ title: "Error Saving Mappings", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save mappings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const clearFilters = () => {
    setSearchTerm('');
    setFilterMenuItem('all');
    setFilterStockItem('all');
  };

  const uniqueMenuItemsForFilter = useMemo(() => ['all', ...new Set(menuItems.map(item => item.name).sort())], [menuItems]);
  const uniqueStockItemsForFilter = useMemo(() => ['all', ...new Set(stockItems.map(item => item.name).sort())], [stockItems]);


  const filteredMappings = useMemo(() => {
    return mappings.filter(mapping => {
      const menuItem = menuItems.find(mi => mi.id === mapping.menuItemId);
      const stockItem = stockItems.find(si => si.id === mapping.stockItemId);

      const searchMatch = searchTerm.toLowerCase() === '' ||
        (menuItem && menuItem.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (stockItem && stockItem.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        mapping.unitUsed.toLowerCase().includes(searchTerm.toLowerCase());
      
      const menuItemFilterMatch = filterMenuItem === 'all' || (menuItem && menuItem.name === filterMenuItem);
      const stockItemFilterMatch = filterStockItem === 'all' || (stockItem && stockItem.name === filterStockItem);
      
      return searchMatch && menuItemFilterMatch && stockItemFilterMatch;
    }).sort((a,b) => {
        const menuItemA = menuItems.find(mi => mi.id === a.menuItemId)?.name || '';
        const menuItemB = menuItems.find(mi => mi.id === b.menuItemId)?.name || '';
        return menuItemA.localeCompare(menuItemB);
    });
  }, [mappings, searchTerm, filterMenuItem, filterStockItem, menuItems, stockItems]);


  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setEditingMapping(undefined);}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {editingMapping?.id ? `Edit Mapping` : "Create New Stock-Menu Mapping"}
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && (
            <MappingEditor 
              mapping={editingMapping} 
              allStockItems={stockItems}
              allMenuItems={menuItems}
              existingMappings={mappings}
              onSave={handleSaveMapping} 
              onClose={() => setIsEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <Button variant="outline" asChild className="mb-4">
              <Link href="/admin/inventory"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory</Link>
            </Button>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <LinkIcon className="mr-3 h-7 w-7" /> Stock-Menu Item Mapping
          </h1>
          <p className="text-muted-foreground">Map stock items to menu items for recipe costing and inventory depletion.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => handleOpenEditor()} className="flex-grow sm:flex-grow-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Mapping
            </Button>
            <Button onClick={handleSaveAllToCsv} disabled={isSaving || isLoading} className="flex-grow sm:flex-grow-0">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save All to CSV
            </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline">Current Mappings ({mappings.length})</CardTitle>
                <CardDescription>Changes are local until "Save All to CSV" is clicked.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <Input
                    placeholder="Search by item name, unit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:w-52"
                />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm"><ListFilter className="mr-2 h-4 w-4"/> Filters</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 z-50" align="end">
                        <div className="grid gap-4">
                        <div className="space-y-2"><h4 className="font-medium leading-none">Filter Options</h4></div>
                        <div className="grid gap-3">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterMenuItem">Menu Item</Label>
                                <Select value={filterMenuItem} onValueChange={setFilterMenuItem}>
                                    <SelectTrigger id="filterMenuItem" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Menu Item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueMenuItemsForFilter.map(name => <SelectItem key={name} value={name}>{name === 'all' ? 'All Menu Items' : name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterStockItem">Stock Item</Label>
                                <Select value={filterStockItem} onValueChange={setFilterStockItem}>
                                    <SelectTrigger id="filterStockItem" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Stock Item" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueStockItemsForFilter.map(name => <SelectItem key={name} value={name}>{name === 'all' ? 'All Stock Items' : name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading mappings...</span></div>
          ) : filteredMappings.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <Table>
                <TableHeaderComponent>
                  <TableRow>
                    <TableHead>Menu Item</TableHead>
                    <TableHead>Stock Item</TableHead>
                    <TableHead>Quantity Used</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeaderComponent>
                <TableBody>
                  {filteredMappings.map((mapping) => {
                    const menuItem = menuItems.find(mi => mi.id === mapping.menuItemId);
                    const stockItem = stockItems.find(si => si.id === mapping.stockItemId);
                    return (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-semibold text-primary">{menuItem?.name || 'N/A'}</TableCell>
                      <TableCell>{stockItem?.name || 'N/A'}</TableCell>
                      <TableCell>{mapping.quantityUsedPerServing}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{mapping.unitUsed}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditor(mapping)}><Edit3 className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeaderComponent>
                                    <AlertDialogTitleComponent>Delete Mapping?</AlertDialogTitleComponent>
                                  <AlertDialogDescription>
                                    This will mark the mapping between "{menuItem?.name}" and "{stockItem?.name}" for deletion. Save all to CSV to make it permanent.
                                </AlertDialogDescription>
                                </AlertDialogHeaderComponent>
                                <AlertDialogFooterComponent><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteMapping(mapping.id)}>Delete Locally</AlertDialogAction></AlertDialogFooterComponent>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-16">
              <PackageSearch className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Mappings Found</h2>
              <p className="text-muted-foreground">
                {searchTerm || filterMenuItem !== 'all' || filterStockItem !== 'all' ? 
                 "No mappings match your current search/filter criteria." : 
                 "No stock items are mapped to menu items yet. Click 'Add New Mapping' to start."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
