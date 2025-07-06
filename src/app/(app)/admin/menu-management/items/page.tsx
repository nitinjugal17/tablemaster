
"use client";
import { MenuItemEditor } from '@/components/admin/MenuItemEditor';
import { useState, useEffect, useMemo } from 'react';
import type { MenuItem as MenuItemType, StockItem, StockMenuMapping } from '@/lib/types'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, ListFilter, Loader2, MoreVertical, Image as ImageIcon, CheckCircle, XCircle, Save, ChevronDown, SlidersHorizontal, DollarSign, Star } from 'lucide-react';
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
  AlertDialogHeader as AlertDialogHeaderComponent, // Renamed for clarity
  AlertDialogTitle as AlertDialogTitleComponent, // Renamed for clarity
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
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadTableHeader, TableRow } from '@/components/ui/table'; // Renamed TableHeader to ShadTableHeader
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { getMenuItems, saveMenuItemChanges, getStockItems, getStockMenuMappings, saveStockMenuMappings, getAddonGroups } from '@/app/actions/data-management-actions';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { BASE_CURRENCY_CODE } from '@/lib/types';


export default function MenuItemsManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [initialMenuItems, setInitialMenuItems] = useState<MenuItemType[]>([]); 
  
  const [allStockItems, setAllStockItems] = useState<StockItem[]>([]);
  const [allStockMenuMappings, setAllStockMenuMappings] = useState<StockMenuMapping[]>([]);
  const [initialStockMenuMappings, setInitialStockMenuMappings] = useState<StockMenuMapping[]>([]);


  const [editingItem, setEditingItem] = useState<Partial<MenuItemType> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { currencySymbol, convertPrice, currencyCode: displayCurrencyCode } = useCurrency();

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

  useEffect(() => {
    async function fetchAllData() {
      setIsLoading(true);
      try {
        const [items, stockItemsData, stockMenuMappingsData, addonGroupsData] = await Promise.all([
          getMenuItems(),
          getStockItems(),
          getStockMenuMappings(),
          getAddonGroups(),
        ]);
        setMenuItems(items);
        setInitialMenuItems(JSON.parse(JSON.stringify(items)));
        
        setAllStockItems(stockItemsData);
        setAllStockMenuMappings(stockMenuMappingsData);
        setInitialStockMenuMappings(JSON.parse(JSON.stringify(stockMenuMappingsData)));

      } catch (error) {
        console.error("Failed to fetch data for menu management:", error);
        toast({
          title: "Error Loading Data",
          description: "Could not load menu items, stock items, or mappings.",
          variant: "destructive",
        });
        setMenuItems([]);
        setInitialMenuItems([]);
        setAllStockItems([]);
        setAllStockMenuMappings([]);
        setInitialStockMenuMappings([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllData();
  }, [toast]);

  const handleCategoryFilterChange = (category: string) => {
    setFilterValues(prev => {
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

  const uniqueCategories = useMemo(() => [...new Set(menuItems.map(item => item.category).filter(Boolean).sort())], [menuItems]);
  const uniqueCuisines = useMemo(() => ['all', ...new Set(menuItems.map(item => item.cuisine).filter((c): c is string => !!c).sort())], [menuItems]);
  const uniqueDietaryOptions = useMemo(() => ['all', ...new Set(menuItems.map(item => item.dietaryRestrictions).filter((d): d is string => !!d).sort())], [menuItems]);


  const handleSaveItemWithMappings = async (
    menuItemData: Partial<MenuItemType>, 
    mappingsData: StockMenuMapping[], 
    originalMenuItemId?: string 
  ) => {
    const menuItemIdToUse = menuItemData.id || originalMenuItemId || crypto.randomUUID();
    if (!menuItemData.id) { 
        menuItemData.id = menuItemIdToUse;
    }
    
    setMenuItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.id === menuItemIdToUse);
      if (existingIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingIndex] = { ...prevItems[existingIndex], ...menuItemData } as MenuItemType;
        return updatedItems;
      } else {
        const newItem: MenuItemType = {
          id: menuItemIdToUse,
          name: menuItemData.name || 'Unnamed Item',
          description: menuItemData.description || 'No description',
          portionDetails: menuItemData.portionDetails || [],
          category: menuItemData.category || 'Uncategorized',
          imageUrl: menuItemData.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(menuItemData.name || 'Item')}`,
          cuisine: menuItemData.cuisine,
          ingredients: menuItemData.ingredients,
          dietaryRestrictions: menuItemData.dietaryRestrictions,
          recipe: menuItemData.recipe,
          preparationMethod: menuItemData.preparationMethod,
          synonyms: menuItemData.synonyms || '',
          isAvailable: menuItemData.isAvailable === undefined ? true : menuItemData.isAvailable,
          isSignatureDish: menuItemData.isSignatureDish || false,
          aiHint: menuItemData.aiHint || menuItemData.name?.toLowerCase().split(' ').slice(0,2).join(' '),
          calculatedCost: menuItemData.calculatedCost, // Ensure calculatedCost is carried over
        };
        return [...prevItems, newItem];
      }
    });

    setAllStockMenuMappings(prevMappings => {
      const otherMappings = prevMappings.filter(m => m.menuItemId !== menuItemIdToUse);
      const updatedMappingsForThisItem = mappingsData.map(m => ({
        ...m,
        menuItemId: menuItemIdToUse 
      }));
      return [...otherMappings, ...updatedMappingsForThisItem];
    });

    toast({
        title: "Menu Item & Mappings Updated Locally",
        description: `${menuItemData.name} and its stock mappings have been updated. Click 'Save All Changes' to persist.`,
    });
        
    setIsEditorOpen(false);
    setEditingItem(undefined);
  };
  
  const handleSaveAllToCsv = async () => {
    setIsSavingAll(true);
    toast({ title: "Attempting to Save Changes...", description: "Processing changes to menu items and stock mappings." });

    let menuItemsSaved = false;
    let mappingsSaved = false;

    const menuItemsToUpsert: MenuItemType[] = [];
    const currentMenuItemMap = new Map(menuItems.map(item => [item.id, item]));
    const initialMenuItemMap = new Map(initialMenuItems.map(item => [item.id, item]));
    for (const currentItem of menuItems) {
      const initialItem = initialMenuItemMap.get(currentItem.id);
      if (!initialItem || JSON.stringify(currentItem) !== JSON.stringify(initialItem)) {
        menuItemsToUpsert.push(currentItem);
      }
    }
    const menuItemIdsToDelete: string[] = [];
    for (const initialItem of initialMenuItems) {
      if (!currentMenuItemMap.has(initialItem.id)) {
        menuItemIdsToDelete.push(initialItem.id);
      }
    }
    
    if (menuItemsToUpsert.length > 0 || menuItemIdsToDelete.length > 0) {
      try {
        // Ensure saveMenuItemChanges recalculates costs before saving
        const menuResult = await saveMenuItemChanges({ upserts: menuItemsToUpsert, deletes: menuItemIdsToDelete });
        if (menuResult.success) {
          toast({ title: "Menu Items Saved to CSV!", description: menuResult.message });
          // Refetch menu items after saving to get updated calculated costs from the server-side calculation
          const refreshedMenuItems = await getMenuItems();
          setMenuItems(refreshedMenuItems);
          setInitialMenuItems(JSON.parse(JSON.stringify(refreshedMenuItems))); 
          menuItemsSaved = true;
        } else {
          toast({ title: "Error Saving Menu Items", description: menuResult.message, variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error Saving Menu Items", description: (error as Error).message, variant: "destructive" });
      }
    } else {
      toast({ title: "No Menu Item Changes", description: "No modifications to menu items to save." });
      menuItemsSaved = true; 
    }

    if (JSON.stringify(allStockMenuMappings) !== JSON.stringify(initialStockMenuMappings)) {
        try {
            const validMappingsToSave = allStockMenuMappings.filter(m => menuItems.some(mi => mi.id === m.menuItemId));
            const mappingResult = await saveStockMenuMappings(validMappingsToSave);
            if (mappingResult.success) {
                toast({ title: "Stock Mappings Saved to CSV!", description: mappingResult.message });
                setAllStockMenuMappings(validMappingsToSave); 
                setInitialStockMenuMappings(JSON.parse(JSON.stringify(validMappingsToSave)));
                mappingsSaved = true;
            } else {
                toast({ title: "Error Saving Stock Mappings", description: mappingResult.message, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error Saving Stock Mappings", description: (error as Error).message, variant: "destructive" });
        }
    } else {
        toast({ title: "No Stock Mapping Changes", description: "No modifications to stock mappings to save."});
        mappingsSaved = true;
    }

    setIsSavingAll(false);
  };


  const handleAddNewItem = () => {
    setEditingItem(undefined); 
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
        title: "Item & Mappings Marked for Deletion (Locally)",
        description: `Item and its stock mappings marked for deletion. Click 'Save All Changes' to persist.`,
        variant: "destructive"
    });
  };

  const filteredMenuItems = menuItems.filter(item => {
    const searchTermLower = searchTerm.toLowerCase();
    const searchFields = [
        item.name.toLowerCase(),
        item.id.toLowerCase(),
        item.category.toLowerCase(),
        item.synonyms?.toLowerCase() || '',
        item.cuisine?.toLowerCase() || '',
        item.ingredients?.toLowerCase() || '',
        item.description.toLowerCase(),
    ];
    const searchMatch = searchTermLower === '' || searchFields.some(field => field.includes(searchTermLower));
    
    const categoryMatch = filterValues.categories.length === 0 || (item.category && filterValues.categories.includes(item.category));
    const cuisineMatch = filterValues.cuisine === 'all' || (item.cuisine && item.cuisine === filterValues.cuisine);
    const dietaryMatch = filterValues.dietary === 'all' || (item.dietaryRestrictions && item.dietaryRestrictions === filterValues.dietary);
    
    const availabilityMatch = filterValues.availability === 'all' ||
      (filterValues.availability === 'available' && item.isAvailable) ||
      (filterValues.availability === 'unavailable' && !item.isAvailable);
    
    const defaultPrice = item.portionDetails.find(p => p.isDefault)?.price || item.portionDetails[0]?.price || 0;
    const priceMin = parseFloat(filterValues.priceMin);
    const priceMax = parseFloat(filterValues.priceMax);
    const priceMatch = 
        (isNaN(priceMin) || defaultPrice >= priceMin) &&
        (isNaN(priceMax) || defaultPrice <= priceMax);

    return searchMatch && categoryMatch && cuisineMatch && dietaryMatch && availabilityMatch && priceMatch;
  });

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
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Menu Items</h1>
          <p className="text-muted-foreground">Create, update, and manage menu items & their stock mappings. Prices in editor are {BASE_CURRENCY_CODE}. Changes local until "Save All Changes".</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleAddNewItem} className="flex-grow sm:flex-grow-0">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
          </Button>
           <Button onClick={handleSaveAllToCsv} disabled={isSavingAll} className="flex-grow sm:flex-grow-0">
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
                  onCheckedChange={() => setFilterValues(prev => ({...prev, categories: []}))}
                >
                  All Categories
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {uniqueCategories.map(cat => (
                  <DropdownMenuCheckboxItem
                    key={cat}
                    checked={filterValues.categories.includes(cat)}
                    onCheckedChange={() => handleCategoryFilterChange(cat)}
                  >
                    {cat}
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
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter Options</h4>
                    <p className="text-sm text-muted-foreground">
                      Refine your menu item list. Price filters are in {BASE_CURRENCY_CODE}.
                    </p>
                  </div>
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
                      <Label htmlFor="priceMin" className="text-sm">Min Price ({BASE_CURRENCY_CODE})</Label>
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
                      <Label htmlFor="priceMax" className="text-sm">Max Price ({BASE_CURRENCY_CODE})</Label>
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
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Loading menu items...</p>
            </div>
          ) : filteredMenuItems.length > 0 ? (
            <Table>
              <ShadTableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Name / ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price ({currencySymbol})</TableHead>
                  <TableHead>Cost ({BASE_CURRENCY_CODE})</TableHead>
                  <TableHead>Cuisine</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead>Portions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </ShadTableHeader>
              <TableBody>
                {filteredMenuItems.map(item => {
                  const defaultPortion = item.portionDetails.find(p => p.isDefault) || item.portionDetails[0] || { name: "fixed", price: 0 };
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
                    <TableCell>{currencySymbol}{displayItemPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.calculatedCost !== undefined 
                        ? <span className="flex items-center text-xs text-muted-foreground">{BASE_CURRENCY_CODE} {item.calculatedCost.toFixed(2)}</span> 
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
                        {item.portionDetails && item.portionDetails.length > 0 ? 
                            item.portionDetails.map(p => <Badge key={p.name} variant="secondary" className="mr-1 capitalize">{p.name}</Badge>) : 
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
                                    This action cannot be undone. This will mark the menu item "{item.name}" and its associated stock mappings for deletion from the CSV upon next "Save All Changes" action.
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
        </CardContent>
      </Card>
    </div>
  );
}
