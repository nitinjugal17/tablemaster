
"use client";

import type { MenuItem as MenuItemType, AddonGroup } from '@/lib/types';
import { Utensils } from 'lucide-react';
import { MenuItemRow } from './MenuItemRow';

interface MenuListProps {
  items: MenuItemType[];
  onAddToCart?: (item: MenuItemType, selectedPortion: { name: string; price: number; }) => void;
  discountedItemIds?: Set<string>;
  addonGroups: AddonGroup[];
}

const MenuList: React.FC<MenuListProps> = ({ items, onAddToCart, discountedItemIds, addonGroups }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-16">
        <Utensils className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg text-muted-foreground">No menu items found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <MenuItemRow 
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

export default MenuList;
