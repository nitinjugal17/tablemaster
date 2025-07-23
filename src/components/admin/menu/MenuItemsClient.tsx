
"use client";
import { MenuItemEditor } from '@/components/admin/MenuItemEditor';
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { MenuItem as MenuItemType, StockItem, StockMenuMapping, AddonGroup, MenuItemPortion } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, ListFilter, Loader2, MoreVertical, Image as ImageIcon, CheckCircle, XCircle, Save, ChevronDown, SlidersHorizontal, DollarSign, Star, Zap, ShoppingBag, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader as AlertDialogHeaderComponent,
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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadTableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { saveMenuItemChanges, getStockItems, getStockMenuMappings, getAddonGroups, getMenuItems, saveStockMenuMappings } from '@/app/actions/data-management-actions';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { BASE_CURRENCY_CODE } from '@/lib/types';
import { parsePortionDetails } from '@/lib/utils';

interface MenuItemsClientProps {
    initialMenuItems: MenuItemType[];
    initialStockItems: StockItem[];
    initialStockMenuMappings: StockMenuMapping[];
    initialAddonGroups: AddonGroup[];
    refreshData: (showToast?: boolean) => Promise<void>;
    isLoading: boolean;
}

export function MenuItemsClient({
    initialMenuItems,
    initialStockItems,
    initialStockMenuMappings,
    initialAddonGroups,
    refreshData,
    isLoading
}: MenuItemsClientProps) {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItem[]>(initialStockItems);
  const [allStockMenuMappings, setAllStockMenuMappings] = useState<StockMenuMapping[]>(initialStockMenuMappings);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>(initialAddonGroups);
  
  const [editingItem, setEditingItem] = useState<Partial<MenuItemType> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { currencySymbol, convertPrice, currencyCode: displayCurrencyCode } = useCurrency();

  useEffect(() => {
    const parsedAndSorted = initialMenuItems
        .sort((a, b) => a.name.localeCompare(b.name));
    setMenuItems(parsedAndSorted);
    setAllStockItems(initialStockItems);
    setAllStockMenuMappings(initialStockMenuMappings);
    setAddonGroups(initialAddonGroups);
  }, [initialMenuItems, initialStockItems, initialStockMenuMappings, initialAddonGroups]);


  const [filterValues, setFilterValues] = useState<{
    categories: string[]; 
    cuisine: string;
    dietary: string;
    availability: string; 
    priceMin: string;
    priceMax: string;
  }>({
    categories: [], 
    cuisine: 'all',
    dietary: 'all',
    availability: 'all',
    priceMin: '',
    priceMax: '',
  });

  const handleCategoryFilterChange = (category: string) => {
    setFilterValues(prev => {
      if (category === 'All') return { ...prev, categories: [] };
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories: newCategories };
    });
  };

  const handleFilterChange = (filterName: keyof Omit<typeof filterValues, 'categories'>, value: string | number) => {
    setFilterValues(prev => ({ ...prev, [filterName]: String(value) }));
  };

  const clearFilters = () => {
    setFilterValues({
      categories: [],
      cuisine: 'all',
      dietary: 'all',
      availability: 'all',
      priceMin: '',
      priceMax: '',
    });
    setSearchTerm('');
  };

  const uniqueCategories = useMemo(() => Array.from(new Set(menuItems.map(item => item.category).filter(Boolean).sort())), [menuItems]);
  const uniqueCuisines = useMemo(() => ['all', ...Array.from(new Set(menuItems.map(item => item.cuisine).filter((c): c is string => !!c).sort()))], [menuItems]);
  const uniqueDietaryOptions = useMemo(() => ['all', ...Array.from(new Set(menuItems.map(item => item.dietaryRestrictions).filter((d): d is string => !!d).sort()))], [menuItems]);


  const handleSaveItemWithMappings = (
    menuItemData: Partial<MenuItemType>,
    mappingsData: StockMenuMapping[],
    originalId?: string
  ) => {
    const finalId = menuItemData.id || crypto.randomUUID();
    menuItemData.id = finalId;

    setMenuItems(prevItems => {
        const existingIndex = prevItems.findIndex(item => item.id === (originalId || finalId));
        if (existingIndex > -1) {
            // Update existing item
            const updatedItems = [...prevItems];
            updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...menuItemData } as MenuItemType;
            return updatedItems.sort((a, b) => a.name.localeCompare(b.name));
        }
        // Add new item
        return [...prevItems, menuItemData as MenuItemType].sort((a, b) => a.name.localeCompare(b.name));
    });

    setAllStockMenuMappings(prevMappings => {
      const otherMappings = prevMappings.filter(m => m.menuItemId !== (originalId || finalId));
      const updatedMappingsForThisItem = mappingsData.map(m => ({ ...m, menuItemId: finalId }));
      return [...otherMappings, ...updatedMappingsForThisItem];
    });

    toast({
        title: "Item Updated Locally",
        description: `${menuItemData.name} has been updated. Click 'Save All Changes' to persist.`,
    });
        
    setIsEditorOpen(false);
    setEditingItem(undefined);
  };
  
  const handleSaveAllToCsv = async () => {
    setIsSavingAll(true);
    toast({ title: "Saving changes...", description: "Please wait while we save all menu item and mapping updates." });

    try {
        const menuResult = await saveMenuItemChanges(menuItems);
        
        if (!menuResult.success) {
            toast({ title: "Error Saving Menu Items", description: menuResult.message, variant: "destructive" });
            setIsSavingAll(false);
            return;
        }
      
        const mappingResult = await saveStockMenuMappings(allStockMenuMappings);
        if (!mappingResult.success) {
            toast({ title: "Error Saving Stock Mappings", description: mappingResult.message, variant: "destructive" });
            setIsSavingAll(false);
            return;
        }
      
        toast({ title: "Save Successful!", description: "All menu items and stock mappings have been saved." });
      
        // Refresh state from the server to ensure consistency
        await refreshData();
      
    } catch (error) {
       toast({ title: "Save All Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSavingAll(false);
    }
  };


  const handleAddNewItem = () => {
    setEditingItem({
        id: "",
        name: "",
        cuisine: "",
        ingredients: "",
        isAvailable: true,
        isSignatureDish: false,
        isTodaysSpecial: false,
        isMinibarItem: false,
        portionDetails: JSON.stringify([{ name: 'Regular', price: 0, isDefault: true }]),
        category: "Uncategorized",
        imageUrl: "",
        description: "",
        recipe: "",
        preparationMethod: ""
    });
    setIsEditorOpen(true);
  };

  const handleEditItem = (item: MenuItemType) => {
    setEditingItem(item);
    setIsEditorOpen(true);
  };
  
  const handleDeleteItem = (itemId: string) => {
    setMenuItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setAllStockMenuMappings(prevMappings => prevMappings.filter(m => m.menuItemId !== itemId));
    toast({
        title: "Item Marked for Deletion",
        description: `Item will be permanently deleted when you click 'Save All Changes'.`,
        variant: "destructive"
    });
  };

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const searchTermLower = searchTerm.toLowerCase();
      const searchFields = [
          String(item.name || '').toLowerCase(),
          String(item.id || '').toLowerCase(),
          String(item.category || '').toLowerCase(),
          item.synonyms?.toLowerCase() || '',
          item.cuisine?.toLowerCase() || '',
          item.ingredients?.toLowerCase() || '',
          item.description?.toLowerCase() || '',
      ];
      const searchMatch = searchTermLower === '' || searchFields.some(field => field.includes(searchTermLower));
      
      const categoryMatch = filterValues.categories.length === 0 || (item.category && filterValues.categories.includes(item.category));
      const cuisineMatch = filterValues.cuisine === 'all' || (item.cuisine && item.cuisine === filterValues.cuisine);
      const dietaryMatch = filterValues.dietary === 'all' || (item.dietaryRestrictions && item.dietaryRestrictions === filterValues.dietary);
      
      const availabilityMatch = filterValues.availability === 'all' ||
        (filterValues.availability === 'available' && item.isAvailable) ||
        (filterValues.availability === 'unavailable' && !item.isAvailable);
      
      const portions = parsePortionDetails(item.portionDetails);
      const defaultPortion = portions.find(p => p.isDefault) || portions[0];
      const defaultPrice = defaultPortion ? defaultPortion.price : 0;
      const priceMin = parseFloat(filterValues.priceMin);
      const priceMax = parseFloat(filterValues.priceMax);
      const priceMatch = 
          (isNaN(priceMin) || defaultPrice >= priceMin) &&
          (isNaN(priceMax) || defaultPrice <= priceMax);

      return searchMatch && categoryMatch && cuisineMatch && dietaryMatch && availabilityMatch && priceMatch;
    });
  }, [menuItems, searchTerm, filterValues]);

  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setEditingItem(undefined);}}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
           <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {editingItem?.id ? `Edit Menu Item: ${editingItem.name}` : "Create New Menu Item"}
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && (
            <MenuItemEditor
                menuItem={editingItem}
                onSave={handleSaveItemWithMappings}
                allStockItems={allStockItems}
                allStockMenuMappings={allStockMenuMappings}
                allAddonGroups={addonGroups}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Menu Items</h1>
          <p className="text-muted-foreground">Create, update, and manage menu items & their stock mappings. Prices in editor are ${BASE_CURRENCY_CODE}. Changes local until "Save All Changes".</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => refreshData(true)} variant="outline" size="sm" disabled={isLoading || isSavingAll} className="w-full sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Data
          </Button>
          <Button onClick={handleAddNewItem} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
          </Button>
           <Button onClick={handleSaveAllToCsv} disabled={isSavingAll} className="w-full sm:w-auto">
            {isSavingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="font-headline">Current Menu Items ({menuItems.length})</CardTitle>
            <CardDescription>Overview of all items. Displayed prices in {displayCurrencyCode}. Dynamic availability is now active.</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
             <Input 
                placeholder="Search by name, ID, ingredients, synonyms..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:flex-grow sm:w-auto md:w-64"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto justify-between">
                  <span>
                    {filterValues.categories.length === 0 ? "All Categories" : 
                     filterValues.categories.length === 1 ? filterValues.categories[0] :
                     `${filterValues.categories.length} Categories`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50"/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                <DropdownMenuCheckboxItem
                  checked={filterValues.categories.length === 0}
                  onCheckedChange={() => handleCategoryFilterChange('All')}
                >
                  All Categories
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {uniqueCategories.map(category => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={filterValues.categories.includes(category)}
                    onCheckedChange={() => handleCategoryFilterChange(category)}
                  >
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto"><SlidersHorizontal className="mr-2 h-4 w-4"/> Filters</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-50" align="end">
                <div className="grid gap-4">
                  <div className="space-y-2"><h4 className="font-medium leading-none">Filter Options</h4></div>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="filterCuisine" className="text-sm">Cuisine</Label>
                       <Select
                        value={filterValues.cuisine}
                        onValueChange={(value) => handleFilterChange('cuisine', value)}
                      >
                        <SelectTrigger id="filterCuisine" className="col-span-2 h-8 text-sm">
                          <SelectValue placeholder="Select Cuisine" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueCuisines.map(cui => <SelectItem key={cui} value={cui} className="text-sm">{cui === 'all' ? 'All Cuisines' : cui}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="filterDietary" className="text-sm">Dietary</Label>
                      <Select
                        value={filterValues.dietary}
                        onValueChange={(value) => handleFilterChange('dietary', value)}
                      >
                        <SelectTrigger id="filterDietary" className="col-span-2 h-8 text-sm">
                          <SelectValue placeholder="Select Dietary Option" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueDietaryOptions.map(opt => <SelectItem key={opt} value={opt} className="text-sm">{opt === 'all' ? 'All Options' : opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="filterAvailability" className="text-sm">Availability</Label>
                        <Select
                            value={filterValues.availability}
                            onValueChange={(value) => handleFilterChange('availability', value)}
                        >
                            <SelectTrigger id="filterAvailability" className="col-span-2 h-8 text-sm">
                            <SelectValue placeholder="Select Availability" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-sm">All</SelectItem>
                                <SelectItem value="available" className="text-sm">Available</SelectItem>
                                <SelectItem value="unavailable" className="text-sm">Unavailable</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="priceMin" className="text-sm">Min Price (${BASE_CURRENCY_CODE})</Label>
                      <Input
                        id="priceMin"
                        type="number"
                        value={filterValues.priceMin}
                        onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                        placeholder={`${BASE_CURRENCY_CODE} Min`}
                        className="col-span-2 h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="priceMax" className="text-sm">Max Price (${BASE_CURRENCY_CODE})</Label>
                      <Input
                        id="priceMax"
                        type="number"
                        value={filterValues.priceMax}
                        onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                        placeholder={`${BASE_CURRENCY_CODE} Max`}
                        className="col-span-2 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {filteredMenuItems.length > 0 ? (
              <Table>
                <ShadTableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Name / ID</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price (${currencySymbol})</TableHead>
                    <TableHead>Cost (${BASE_CURRENCY_CODE})</TableHead>
                    <TableHead>Cuisine</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead>Portions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </ShadTableHeader>
                <TableBody>
                  {filteredMenuItems.map(item => {
                    const portions = parsePortionDetails(item.portionDetails);
                    const defaultPortion = portions.find(p => p.isDefault) || portions[0] || { name: "fixed", price: 0 };
                    const displayItemPrice = convertPrice(defaultPortion.price);
                    return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Image 
                          src={item.imageUrl || "https://placehold.co/100x100.png"} 
                          alt={item.name} 
                          width={60}
                          height={60}
                          className="rounded-md object-cover aspect-square"
                          data-ai-hint={item.aiHint || item.name.toLowerCase().split(' ').slice(0,2).join(' ')}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-primary">{item.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {String(item.id).substring(0, 8)}...</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>${currencySymbol}{displayItemPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        {typeof item.calculatedCost === 'number'
                          ? <span className="flex items-center text-xs text-muted-foreground">${BASE_CURRENCY_CODE} {item.calculatedCost.toFixed(2)}</span> 
                          : <Badge variant="secondary" className="text-xs">N/A</Badge>
                        }
                      </TableCell>
                      <TableCell>{item.cuisine || 'N/A'}</TableCell>
                      <TableCell>
                          {item.isAvailable ? 
                              <CheckCircle className="h-5 w-5 text-green-600" /> : 
                              <XCircle className="h-5 w-5 text-red-600" />
                          }
                      </TableCell>
                      <TableCell>
                        {item.isSignatureDish && <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />}
                      </TableCell>
                      <TableCell>
                          {portions && portions.length > 0 ? 
                              portions.map(p => <Badge key={p.name} variant="secondary" className="mr-1 capitalize">{p.name}</Badge>) : 
                              <Badge variant="outline">N/A</Badge>
                          }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditItem(item)}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <AlertDialog> 
                              <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive-foreground" 
                                    onSelect={(e) => e.preventDefault()} 
                                  >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                  </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeaderComponent>
                                  <AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent>
                                  <AlertDialogDescription>
                                      This action cannot be undone. This will mark the menu item "{item.name}" and its associated stock mappings for deletion upon next "Save All Changes" action.
                                  </AlertDialogDescription>
                                  </AlertDialogHeaderComponent>
                                  <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteItem(String(item.id))}>Delete Locally</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                             </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            ) : (
               <div className="text-center py-16">
                  <ImageIcon className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
                  <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Menu Items Found</h2>
                  <p className="text-muted-foreground">
                      {searchTerm || Object.values(filterValues).some(v => Array.isArray(v) ? v.length > 0 : (v !== 'all' && v !== '')) ? 
                       "No items match your current search/filter criteria." : 
                       "Your menu is empty. Add some items!"}
                  </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
