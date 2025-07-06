
"use client";
import { useState, useEffect, useMemo } from 'react';
import MenuList from '@/components/menu/MenuList';
import MenuCarouselView from '@/components/menu/MenuCarouselView';
import MenuGridView from '@/components/menu/MenuGridView';
import type { MenuItem as MenuItemType, OrderItem, Order, MenuItemPortion, Offer, Addon, AddonGroup } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { MinusCircle, PlusCircle, ShoppingCart, Trash2, Loader2, Utensils, MessageSquare, Search, SlidersHorizontal, ChevronDown, List, LayoutGrid, GalleryHorizontal as CarouselIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getMenuItems, getOffers, getAddonGroups } from '@/app/actions/data-management-actions'; 
import { addClientLogEntry } from '@/app/actions/logging-actions';
import { useCurrency } from '@/hooks/useCurrency';
import { placePublicTakeawayOrder } from '@/app/actions/order-actions'; 
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { parseISO, isFuture, isPast } from 'date-fns';

type ViewType = 'list' | 'carousel' | 'grid';
const PENDING_TAKEAWAY_CART_KEY = 'pending_takeaway_cart';

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { toast } = useToast();
  const { currencySymbol, convertPrice, currencyCode: displayCurrencyCode } = useCurrency();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterCuisine, setFilterCuisine] = useState<string>('all');
  const [filterDietary, setFilterDietary] = useState<string>('all');
  const [viewType, setViewType] = useState<ViewType>('list');

  useEffect(() => {
    async function fetchPublicData() {
      setIsLoading(true);
      try {
        const [items, allOffers, allAddonGroups] = await Promise.all([
          getMenuItems(), 
          getOffers(),
          getAddonGroups()
        ]);
        setMenuItems(items);
        setAddonGroups(allAddonGroups);

        const now = new Date();
        const currentOffers = allOffers.filter(offer => 
          offer.isActive &&
          (!offer.validFrom || !isFuture(parseISO(offer.validFrom))) &&
          (!offer.validTo || !isPast(parseISO(offer.validTo)))
        );
        setActiveOffers(currentOffers);

      } catch (error) {
        console.error("Failed to fetch menu items:", error);
        toast({
          title: "Error Loading Menu",
          description: "Could not load menu items or offers.",
          variant: "destructive",
        });
        setMenuItems([]);
        setActiveOffers([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPublicData();
  }, [toast]);

  const uniqueCategories = useMemo(() => [...new Set(menuItems.map(item => item.category).filter(Boolean).sort())], [menuItems]);
  const uniqueCuisines = useMemo(() => ['all', ...new Set(menuItems.map(item => item.cuisine).filter((c): c is string => !!c).sort())], [menuItems]);
  const uniqueDietaryOptions = useMemo(() => ['all', ...new Set(menuItems.map(item => item.dietaryRestrictions).filter((d): d is string => !!d).sort())], [menuItems]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      if (category === 'All') return [];
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
      return newCategories;
    });
  };
  
  const getCategoryButtonText = () => {
    if (selectedCategories.length === 0) return "All Categories";
    if (selectedCategories.length === 1) return selectedCategories[0];
    return `${selectedCategories.length} Categories Selected`;
  };


  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);
      
      const searchFields = [
        item.name.toLowerCase(),
        item.description.toLowerCase(),
        item.id.toLowerCase(),
        item.category.toLowerCase(),
        item.cuisine?.toLowerCase() || '',
        item.ingredients?.toLowerCase() || '',
        item.synonyms?.toLowerCase() || '',
      ];
      const matchesSearch = lowerSearchTerm === '' || searchFields.some(field => field.includes(lowerSearchTerm));
      
      const matchesCuisine = filterCuisine === 'all' || item.cuisine === filterCuisine;
      const matchesDietary = filterDietary === 'all' || item.dietaryRestrictions === filterDietary;
      
      return matchesCategory && matchesSearch && matchesCuisine && matchesDietary && item.isAvailable;
    });
  }, [menuItems, searchTerm, selectedCategories, filterCuisine, filterDietary]);
  
  const offeredItemIds = useMemo(() => {
    const ids = new Set<string>();
    activeOffers.forEach(offer => {
        offer.linkedMenuItemIds?.split(',').forEach(id => {
            if (id.trim()) ids.add(id.trim());
        });
    });
    return ids;
  }, [activeOffers]);


  const handleAddToCart = (item: MenuItemType, selectedPortion: { name: string; price: number }) => {
    addClientLogEntry('User added item to cart from public menu.', 'INFO', { itemId: item.id, itemName: item.name, portion: selectedPortion.name, price: selectedPortion.price });
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(cartItem => 
        cartItem.menuItemId === item.id && 
        cartItem.selectedPortion === selectedPortion.name &&
        (cartItem.note || "") === "" 
      );

      if (existingItemIndex > -1) {
        const updatedCart = [...prevItems];
        updatedCart[existingItemIndex].quantity += 1;
        return updatedCart;
      } else {
        return [...prevItems, { 
          menuItemId: item.id, 
          name: item.name, 
          price: selectedPortion.price, 
          quantity: 1, 
          selectedPortion: selectedPortion.name, 
          note: '' 
        }];
      }
    });
    const portionText = selectedPortion.name && selectedPortion.name !== "fixed" ? ` (${selectedPortion.name})` : "";
    toast({ title: `${item.name}${portionText} added to cart!`, description: "You can adjust quantity and add notes in the cart."});
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (itemId: string, portion: string | undefined, note: string | undefined, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prevItems => prevItems.filter(item => !(item.menuItemId === itemId && item.selectedPortion === portion && item.note === note)));
      toast({ title: "Item removed from cart."});
    } else {
      setCartItems(prevItems =>
        prevItems.map(item => (item.menuItemId === itemId && item.selectedPortion === portion && item.note === note ? { ...item, quantity } : item))
      );
    }
  };

  const handleUpdateItemNote = (itemId: string, portion: string | undefined, oldNote: string | undefined, newNote: string) => {
    setCartItems(prevItems =>
      prevItems.map(item => (item.menuItemId === itemId && item.selectedPortion === portion && item.note === oldNote ? { ...item, note: newNote } : item))
    );
  };
  
  const cartTotalInBase = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const displayCartTotal = convertPrice(cartTotalInBase);
  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      localStorage.setItem(PENDING_TAKEAWAY_CART_KEY, JSON.stringify(cartItems));
      toast({
        title: "Please Log In or Sign Up",
        description: "You need to be logged in to complete your order. Your cart has been saved.",
        duration: 5000,
      });
      router.push(`/login?postLoginRedirectPath=/menu&postLoginAction=complete_order`);
      return;
    }

    setIsPlacingOrder(true);
    addClientLogEntry('User initiated takeaway order checkout.', 'INFO', { itemCount: cartItems.length, totalInBase: cartTotalInBase, userId: user?.id });
    
    const customerName = user?.name || "Valued Customer";
    const customerEmail = user?.email || undefined;

    const orderData: Order = {
      id: `ORD-${crypto.randomUUID().substring(0,8).toUpperCase()}`,
      userId: user?.id,
      items: cartItems, 
      total: cartTotalInBase,
      status: 'Pending',
      orderType: 'Takeaway', 
      customerName: customerName,
      email: customerEmail,
      createdAt: new Date().toISOString(),
    };

    try {
        const result = await placePublicTakeawayOrder(orderData);

        if (result.success && result.orderId) {
            let description = `Order #${String(result.orderId).substring(0,8)} for ${currencySymbol}${displayCartTotal.toFixed(2)} has been placed.`;
            if (customerEmail) {
                description += result.customerEmailStatus.sent
                    ? ` A confirmation email was sent to ${customerEmail}.`
                    : ` Failed to send confirmation email: ${result.customerEmailStatus.error || 'Unknown reason'}.`;
            }
            if (result.customerEmailStatus.messageId === 'mock_message_id' && customerEmail) {
                description += ' (Customer email mocked)';
            }
            if (result.adminEmailStatus.messageId === 'mock_message_id') {
                 description += ' (Admin email mocked)';
            }

            toast({
                title: "Order Placed!",
                description: description,
                duration: 7000,
            });
            addClientLogEntry('Takeaway order placed successfully.', 'INFO', { orderId: result.orderId, customerEmailStatus: result.customerEmailStatus, adminEmailStatus: result.adminEmailStatus });
            setCartItems([]);
            setIsCartOpen(false);
        } else {
            toast({
                title: "Order Placement Failed",
                description: result.message,
                variant: "destructive",
            });
            addClientLogEntry('Takeaway order placement failed.', 'ERROR', { error: result.message });
        }
    } catch (error) {
        toast({
            title: "Order Placement Error",
            description: "An unexpected error occurred while placing your order.",
            variant: "destructive",
        });
        console.error("Checkout error:", error);
        addClientLogEntry('Checkout process failed with an unexpected error.', 'ERROR', { error: (error as Error).message });
    } finally {
        setIsPlacingOrder(false);
    }
  }
  
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setFilterCuisine('all');
    setFilterDietary('all');
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Our Menu</h1>
            <p className="text-muted-foreground">Explore our delicious offerings and order for takeaway. Menu items are loaded from our data source.</p>
        </div>
        <Button onClick={() => setIsCartOpen(true)} variant="outline" size="lg" className="relative">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Cart 
          {cartItemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-grow">
            <div className="relative flex-grow sm:flex-grow-0 sm:min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search name, ID, ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
            </div>
            {uniqueCategories.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto justify-between">
                            {getCategoryButtonText()}
                            <ChevronDown className="ml-2 h-4 w-4 opacity-50"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                        <DropdownMenuCheckboxItem
                            checked={selectedCategories.length === 0}
                            onCheckedChange={() => handleCategoryChange('All')}
                        >
                            All Categories
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        {uniqueCategories.map(category => (
                            <DropdownMenuCheckboxItem
                                key={category}
                                checked={selectedCategories.includes(category)}
                                onCheckedChange={() => handleCategoryChange(category)}
                                className="capitalize"
                            >
                                {category}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4"/>Filters</Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 z-50" align="end">
                    <div className="grid gap-4">
                        <div className="space-y-2"><h4 className="font-medium leading-none">Filter Options</h4></div>
                        <div className="grid gap-3">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterCuisinePublicMenu" className="text-sm">Cuisine</Label>
                                <Select value={filterCuisine} onValueChange={setFilterCuisine}>
                                    <SelectTrigger id="filterCuisinePublicMenu" className="col-span-2 h-8 text-sm">
                                        <SelectValue placeholder="Select Cuisine" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueCuisines.map(c => <SelectItem key={c} value={c} className="capitalize text-sm">{c === 'all' ? 'All Cuisines' : c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterDietaryPublicMenu" className="text-sm">Dietary</Label>
                                <Select value={filterDietary} onValueChange={setFilterDietary}>
                                    <SelectTrigger id="filterDietaryPublicMenu" className="col-span-2 h-8 text-sm">
                                        <SelectValue placeholder="Select Dietary Option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueDietaryOptions.map(opt => <SelectItem key={opt} value={opt} className="capitalize text-sm">{opt === 'all' ? 'All Options' : opt}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button onClick={clearAllFilters} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-primary">Clear All Filters</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        <ToggleGroup 
            type="single" 
            value={viewType} 
            onValueChange={(value) => { if (value) setViewType(value as ViewType)}}
            className="shrink-0"
            aria-label="Menu view type"
        >
            <ToggleGroupItem value="list" aria-label="List view" size="sm"><List className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="carousel" aria-label="Carousel view" size="sm"><CarouselIcon className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" size="sm"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading our delicious menu...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <>
          {viewType === 'list' && <MenuList items={filteredItems} onAddToCart={handleAddToCart} discountedItemIds={offeredItemIds} addonGroups={addonGroups}/>}
          {viewType === 'carousel' && <MenuCarouselView items={filteredItems} onAddToCart={handleAddToCart} discountedItemIds={offeredItemIds} addonGroups={addonGroups}/>}
          {viewType === 'grid' && <MenuGridView items={filteredItems} onAddToCart={handleAddToCart} discountedItemIds={offeredItemIds} addonGroups={addonGroups}/>}
        </>
      ) : (
         <div className="text-center py-16">
          <Utensils className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Menu Items Found</h2>
          <p className="text-muted-foreground">
            No items match your current search/filter criteria. Try adjusting your filters.
          </p>
        </div>
      )}


      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="font-headline text-2xl text-primary">Your Takeaway Cart</SheetTitle>
          </SheetHeader>
          {cartItems.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">Your cart is empty.</p>
              <p className="text-sm text-muted-foreground">Add some delicious items from our menu!</p>
              <SheetClose asChild>
                <Button variant="link" className="mt-4 text-primary">Continue Shopping</Button>
              </SheetClose>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-grow my-4 pr-2">
                <div className="space-y-4">
                  {cartItems.map(item => {
                    const menuItemDetails = menuItems.find(mi => mi.id === item.menuItemId);
                    const displayItemPrice = convertPrice(item.price); 
                    const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                                            ? `${item.name} (${item.selectedPortion})` 
                                            : item.name;
                    return (
                    <div key={`${item.menuItemId}-${item.selectedPortion || 'fixed'}-${item.note || 'no-note'}`} className="p-3 bg-muted/50 rounded-md space-y-2"> 
                      <div className="flex items-start space-x-3">
                        <Image 
                          src={menuItemDetails?.imageUrl || "https://placehold.co/100x100.png"} 
                          alt={item.name}
                          width={50} height={50} 
                          className="rounded-md object-cover aspect-square mt-1"
                          data-ai-hint={menuItemDetails?.aiHint || item.name.toLowerCase()}
                        />
                        <div className="flex-grow">
                          <h4 className="font-semibold text-sm">{itemDisplayName}</h4>
                          <p className="text-xs text-muted-foreground">{currencySymbol}{displayItemPrice.toFixed(2)}</p>
                           <div className="flex items-center space-x-1.5 mt-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateQuantity(item.menuItemId, item.selectedPortion, item.note, item.quantity - 1)} disabled={isPlacingOrder}>
                              <MinusCircle className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-sm w-5 text-center">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateQuantity(item.menuItemId, item.selectedPortion, item.note, item.quantity + 1)} disabled={isPlacingOrder}>
                              <PlusCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleUpdateQuantity(item.menuItemId, item.selectedPortion, item.note, 0)} disabled={isPlacingOrder}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                       <div className="flex items-center gap-2">
                         <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                         <Input
                            type="text"
                            placeholder="Add a note for this item (e.g., no onions)"
                            value={item.note || ''}
                            onChange={(e) => handleUpdateItemNote(item.menuItemId, item.selectedPortion, item.note, e.target.value)}
                            className="h-8 text-xs flex-grow"
                            disabled={isPlacingOrder}
                          />
                       </div>
                    </div>
                  )})}
                </div>
              </ScrollArea>
              <SheetFooter className="flex-shrink-0 pt-4 border-t">
                <div className="w-full space-y-3">
                    <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>{currencySymbol}{displayCartTotal.toFixed(2)}</span>
                    </div>
                    <Button onClick={handleCheckout} className="w-full" size="lg" disabled={isPlacingOrder}>
                      {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4"/>}
                      {isPlacingOrder ? "Processing..." : (isAuthenticated ? "Proceed to Checkout" : "Log In/Sign Up to Checkout")}
                    </Button>
                    <SheetClose asChild>
                        <Button variant="outline" className="w-full" disabled={isPlacingOrder}>Continue Shopping</Button>
                    </SheetClose>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
