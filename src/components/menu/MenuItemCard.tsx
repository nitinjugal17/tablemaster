
"use client"; 

import Image from 'next/image';
import type { MenuItem, MenuItemPortion, AddonGroup, Addon } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Info, Zap, Flame, Leaf, WheatOff, Drumstick, Apple, Utensils, ChevronDown, Tag } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionComponent,
  DialogHeader,
  DialogFooter,
  DialogClose,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { parsePortionDetails } from '@/lib/utils';


interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart?: (item: MenuItem, selectedPortion: MenuItemPortion) => void;
  isDiscounted?: boolean;
  addonGroups: AddonGroup[];
}

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


const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onAddToCart, isDiscounted, addonGroups }) => {
  const { currencySymbol, convertPrice, isLoadingDisplayCurrency } = useCurrency();

  const parsedPortionDetails = useMemo(() => parsePortionDetails(item.portionDetails), [item.portionDetails]);

  const defaultPortion = useMemo(() => {
    const df = parsedPortionDetails?.find(p => p.isDefault);
    return df || parsedPortionDetails?.[0] || { name: "fixed", price: 0, isDefault: true };
  }, [parsedPortionDetails]);

  const [selectedPortion, setSelectedPortion] = useState<MenuItemPortion>(defaultPortion);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, Addon | null>>({});

  const displayPrice = convertPrice(defaultPortion.price);
  const hasMultiplePortions = parsedPortionDetails && parsedPortionDetails.length > 1;

  const handleAddToCartInternal = (e: React.MouseEvent, portion: MenuItemPortion) => {
    e.stopPropagation(); // Prevent the dialog from opening when clicking the add button
    if (onAddToCart && item.isAvailable) {
      onAddToCart(item, portion);
    }
  };

  const handleDialogAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(onAddToCart && item.isAvailable) {
        onAddToCart(item, selectedPortion);
    }
  }

  useEffect(() => {
    setSelectedPortion(defaultPortion);
  }, [defaultPortion]);
  
  const relevantAddonGroups = useMemo(() => {
    if (!item.addonGroups || item.addonGroups.length === 0) return [];
    return addonGroups.filter(g => item.addonGroups!.includes(g.id));
  }, [item.addonGroups, addonGroups]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="w-full h-full overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer group flex flex-col">
          <div className="relative w-full h-56">
            <Image
              src={item.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(item.name)}`}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              data-ai-hint={item.aiHint || item.name.toLowerCase().split(' ').slice(0,2).join(' ')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-4 w-full">
              <h3 className="font-headline text-2xl font-bold text-white drop-shadow-lg">{item.name}</h3>
              <p className="text-white/90 text-sm line-clamp-2 drop-shadow-md">{item.description}</p>
            </div>
             <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
                {!item.isAvailable && (
                    <Badge variant="destructive">Unavailable</Badge>
                )}
                {isDiscounted && item.isAvailable && (
                    <Badge variant="default" className="bg-primary/90 text-primary-foreground">
                        <Tag className="h-3 w-3 mr-1" />
                        Offer
                    </Badge>
                )}
            </div>
            {onAddToCart && item.isAvailable && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {hasMultiplePortions ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" className="rounded-full bg-primary/80 hover:bg-primary backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                            <ShoppingCart className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {parsedPortionDetails.map(portion => (
                          <DropdownMenuItem key={portion.name} onClick={(e) => handleAddToCartInternal(e, portion)} className="capitalize">
                            Add {portion.name} ({isLoadingDisplayCurrency ? '...' : currencySymbol}{convertPrice(portion.price).toFixed(2)})
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button size="icon" className="rounded-full bg-primary/80 hover:bg-primary backdrop-blur-sm" onClick={(e) => handleAddToCartInternal(e, defaultPortion)}>
                        <ShoppingCart className="h-5 w-5" />
                    </Button>
                )}
              </div>
            )}
          </div>
          <CardFooter className="p-4 bg-muted/50 mt-auto">
            <div className="flex justify-between items-center w-full">
                <span className="text-xl font-bold text-accent">
                    {isLoadingDisplayCurrency ? '...' : currencySymbol}{displayPrice.toFixed(2)}
                    {hasMultiplePortions && <span className="text-xs font-normal text-muted-foreground ml-1"> (Starts From)</span>}
                </span>
                <span className="text-sm font-medium text-primary hover:underline">View Details <Info className="inline h-4 w-4 ml-1"/></span>
            </div>
          </CardFooter>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
        <ScrollArea className="flex-grow min-h-0">
          <div className="relative w-full h-64">
            <Image
              src={item.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(item.name)}`}
              alt={item.name}
              fill
              sizes="100vw"
              className="object-cover"
              data-ai-hint={item.aiHint || item.name.toLowerCase().split(' ').slice(0,2).join(' ')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
          <div className="p-6 space-y-6">
            <DialogHeader className="text-left">
              <DialogTitle className="font-headline text-4xl text-primary">{item.name}</DialogTitle>
              <div className="flex flex-wrap gap-2 pt-2">
                {isDiscounted && <Badge variant="default" className="bg-primary/90 text-primary-foreground"><Tag className="h-3 w-3 mr-1" />Special Offer</Badge>}
                {item.category && <Badge variant="secondary">{item.category}</Badge>}
                {item.cuisine && <Badge variant="outline">{item.cuisine}</Badge>}
                {item.dietaryRestrictions && <Badge variant="outline" className="text-green-700 border-green-400 bg-green-50">{item.dietaryRestrictions}</Badge>}
              </div>
              <DialogDescriptionComponent className="text-base text-foreground/80 pt-4">
                {item.description}
              </DialogDescriptionComponent>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center"><Utensils className="mr-2 h-5 w-5 text-accent" /> Portions & Pricing</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={selectedPortion.name} onValueChange={(value) => {
                    const newPortion = parsedPortionDetails.find(p => p.name === value) || defaultPortion;
                    setSelectedPortion(newPortion);
                  }}>
                    {parsedPortionDetails.map(portion => (
                      <div key={portion.name} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={portion.name} id={`portion-${portion.name}`} />
                          <Label htmlFor={`portion-${portion.name}`} className="font-medium capitalize cursor-pointer">{portion.name}</Label>
                        </div>
                        <span className="font-semibold">{isLoadingDisplayCurrency ? '...' : currencySymbol}{convertPrice(portion.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {(item.calories || item.carbs || item.protein || item.fat) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center"><Flame className="mr-2 h-5 w-5 text-accent" /> Nutritional Info</CardTitle>
                    <CardDescription className="text-xs">{item.servingSizeSuggestion || "Estimated per default serving"}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    {item.calories && <div><strong>Calories:</strong> {item.calories} kcal</div>}
                    {item.energyKJ && <div><strong>Energy:</strong> {item.energyKJ} kJ</div>}
                    {item.carbs && <div><strong>Carbs:</strong> {item.carbs}g</div>}
                    {item.protein && <div><strong>Protein:</strong> {item.protein}g</div>}
                    {item.fat && <div><strong>Fat:</strong> {item.fat}g</div>}
                  </CardContent>
                </Card>
              )}
            </div>

             {relevantAddonGroups.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                            <Plus className="mr-2 h-5 w-5 text-accent"/> Customize Your Item
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {relevantAddonGroups.map(group => {
                            const addonsArray = getAddonsArray(group.addons);
                            return (
                                <div key={group.id}>
                                    <h4 className="font-semibold mb-2">{group.name}</h4>
                                    {addonsArray.map(addon => (
                                        <div key={addon.id} className="flex items-center space-x-2 py-1">
                                            <Checkbox id={`${group.id}-${addon.id}`} />
                                            <label htmlFor={`${group.id}-${addon.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow">
                                                {addon.name}
                                            </label>
                                            <span className="text-sm text-muted-foreground">+ {isLoadingDisplayCurrency ? '...' : currencySymbol}{convertPrice(addon.price).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}

            {item.ingredients && (
              <div>
                <h4 className="font-semibold text-primary">Ingredients</h4>
                <p className="text-sm text-muted-foreground">{item.ingredients}</p>
              </div>
            )}
            {item.recipe && (
              <div>
                <h4 className="font-semibold text-primary">Our Recipe</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.recipe}</p>
              </div>
            )}
            {item.preparationMethod && (
              <div>
                <h4 className="font-semibold text-primary">Preparation Method</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.preparationMethod}</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="p-4 border-t flex-shrink-0 sm:justify-between items-center">
            <div className="text-xl font-bold text-accent">
                {isLoadingDisplayCurrency ? '...' : currencySymbol}{convertPrice(selectedPortion.price).toFixed(2)}
            </div>
            <div className="flex gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                </DialogClose>
                {onAddToCart && item.isAvailable && (
                    <Button type="button" onClick={handleDialogAddClick}>
                        <Plus className="mr-2 h-4 w-4"/> Add to Cart
                    </Button>
                )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemCard;
