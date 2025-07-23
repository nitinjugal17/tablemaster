
"use client"; 

import Image from 'next/image';
import type { MenuItem, MenuItemPortion, AddonGroup } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Tag, ChevronDown } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { parsePortionDetails } from '@/lib/utils';
import { memo } from 'react';

interface MenuItemRowProps {
  item: MenuItem;
  onAddToCart?: (item: MenuItem, selectedPortion: MenuItemPortion) => void;
  isDiscounted?: boolean;
  addonGroups: AddonGroup[];
}

export const MenuItemRow: React.FC<MenuItemRowProps> = memo(({ item, onAddToCart, isDiscounted }) => {
  const { currencySymbol, convertPrice, isLoadingDisplayCurrency } = useCurrency();
  
  const parsedPortionDetails = parsePortionDetails(item.portionDetails);
  const defaultPortion = parsedPortionDetails.find(p => p.isDefault) || parsedPortionDetails[0] || { name: "fixed", price: 0, isDefault: true };
  const hasMultiplePortions = parsedPortionDetails.length > 1;

  const handleAddToCartInternal = (e: React.MouseEvent, portion: MenuItemPortion) => {
    e.stopPropagation();
    if (onAddToCart && item.isAvailable) {
      onAddToCart(item, portion);
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors">
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-md overflow-hidden flex-shrink-0">
        <Image
          src={item.imageUrl || `https://placehold.co/128x128.png?text=${encodeURIComponent(item.name)}`}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 25vw, 128px"
          className="object-cover"
          data-ai-hint={item.aiHint || item.name.toLowerCase().split(' ').slice(0, 2).join(' ')}
        />
      </div>
      <div className="flex-grow flex flex-col h-full">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="font-headline text-lg font-semibold text-primary">{item.name}</h3>
            <div className="font-bold text-lg text-accent text-right">
                {isLoadingDisplayCurrency ? '...' : currencySymbol}{convertPrice(defaultPortion.price).toFixed(2)}
                {hasMultiplePortions && <span className="text-xs font-normal text-muted-foreground ml-1"> (from)</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {isDiscounted && <Badge variant="default" className="bg-primary/90 text-primary-foreground"><Tag className="h-3 w-3 mr-1" />Special Offer</Badge>}
            {item.cuisine && <Badge variant="outline">{item.cuisine}</Badge>}
            {item.dietaryRestrictions && <Badge variant="outline" className="text-green-700 border-green-400 bg-green-50">{item.dietaryRestrictions}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
        </div>
        <div className="mt-auto pt-3 flex justify-end">
            {onAddToCart && item.isAvailable && (
                 hasMultiplePortions ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                            <PlusCircle className="h-4 w-4 mr-1.5"/> Add <ChevronDown className="ml-1 h-3 w-3"/>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {parsedPortionDetails.map(portion => (
                          <DropdownMenuItem key={portion.name} onClick={(e) => handleAddToCartInternal(e, portion)} className="capitalize text-xs">
                            Add {portion.name} ({isLoadingDisplayCurrency ? '...' : currencySymbol}{convertPrice(portion.price).toFixed(2)})
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button size="sm" onClick={(e) => handleAddToCartInternal(e, defaultPortion)}>
                        <PlusCircle className="h-4 w-4 mr-1.5"/> Add to Cart
                    </Button>
                )
            )}
             {!item.isAvailable && (
                <Badge variant="destructive">Unavailable</Badge>
             )}
        </div>
      </div>
    </div>
  );
});

MenuItemRow.displayName = 'MenuItemRow';
