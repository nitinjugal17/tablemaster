
"use client";

import type { MenuItem as MenuItemType, AddonGroup } from '@/lib/types';
import MenuItemCard from './MenuItemCard';

interface MenuListProps {
  items: MenuItemType[];
  onAddToCart?: (item: MenuItemType, selectedPortion: { name: string; price: number; }) => void;
  discountedItemIds?: Set<string>;
  addonGroups: AddonGroup[];
}

const MenuList: React.FC<MenuListProps> = ({ items, onAddToCart, discountedItemIds, addonGroups }) => {

  return (
    <div className="space-y-8">
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
      ) : (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">No menu items match your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default MenuList;
