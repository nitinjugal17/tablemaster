
"use client";
import type { MenuItem as MenuItemType, AddonGroup } from '@/lib/types';
import MenuItemCard from './MenuItemCard';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Utensils } from 'lucide-react';

interface MenuCarouselViewProps {
  items: MenuItemType[];
  onAddToCart?: (item: MenuItemType, selectedPortion: { name: string; price: number; }) => void;
  discountedItemIds?: Set<string>;
  addonGroups: AddonGroup[];
}

// This component is currently unused but kept for potential future use.
// The main page now uses grid and list views.
const MenuCarouselView: React.FC<MenuCarouselViewProps> = ({ items, onAddToCart, discountedItemIds, addonGroups }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12">
        <Utensils className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg text-muted-foreground">No items to display in carousel.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
      <div className="flex space-x-4 p-4">
        {items.map(item => (
          <div key={item.id} className="w-[300px] sm:w-[350px] shrink-0">
            <MenuItemCard 
              item={item} 
              onAddToCart={onAddToCart}
              isDiscounted={discountedItemIds?.has(item.id)}
              addonGroups={addonGroups}
            />
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default MenuCarouselView;
