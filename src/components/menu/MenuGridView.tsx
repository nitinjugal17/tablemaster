
"use client";

import type { MenuItem as MenuItemType, AddonGroup } from '@/lib/types';
import MenuItemCard from './MenuItemCard';
import { Utensils } from 'lucide-react';

interface MenuGridViewProps {
  items: MenuItemType[];
  onAddToCart?: (item: MenuItemType, selectedPortion: { name: string; price: number; }) => void;
  discountedItemIds?: Set<string>;
  addonGroups: AddonGroup[];
}

const MenuGridView: React.FC<MenuGridViewProps> = ({ items, onAddToCart, discountedItemIds, addonGroups }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16">
        <Utensils className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg text-muted-foreground">No menu items found for this view.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      {items.map(item => (
        <MenuItemCard 
          key={item.id} 
          item={item} 
          onAddToCart={onAddToCart}
          isDiscounted={discountedItemIds?.has(item.id)}
          addonGroups={addonGroups}
        />
      ))}
    </div>
  );
};

export default MenuGridView;
