// src/lib/types/menu.types.ts

export interface MenuItemPortion {
  name: string;
  price: number; // Price for this specific portion in BASE_CURRENCY_CODE
  isDefault?: boolean; // Indicates if this is the default portion shown/priced
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  portionDetails: MenuItemPortion[];
  category: string;
  imageUrl: string;
  aiHint?: string;
  synonyms?: string;
  isAvailable: boolean;
  isSignatureDish?: boolean;
  isTodaysSpecial?: boolean;
  isMinibarItem?: boolean;
  cuisine?: string;
  ingredients?: string;
  dietaryRestrictions?: string;
  recipe?: string;
  preparationMethod?: string;
  prepTime?: number; // In minutes
  cookTime?: number; // In minutes
  servings?: number;
  addonGroups?: string[]; // Array of AddonGroup IDs
  calculatedCost?: number;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  energyKJ?: number;
  servingSizeSuggestion?: string;
}

export type OrderItem = {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number; // Price of the selected portion at the time of adding to cart/order
  selectedPortion?: string; // e.g., "Small", "Large", "fixed"
  note?: string;
  currentCalculatedCost?: number; // For admin views, cost of this item at current rates
  // Nutritional info per item in order
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  energyKJ?: number;
  servingSizeSuggestion?: string;
};

export interface Addon {
    id: string;
    name: string;
    price: number; // Price in BASE_CURRENCY
}

export interface AddonGroup {
    id: string;
    name: string;
    description?: string;
    addons: Addon[]; // Array of addon options within this group
}

export interface Menu {
    id: string;
    name: string; // e.g., "Lunch Menu", "Summer Specials"
    description?: string;
    isActive: boolean;
    menuItemIds: string[]; // Array of MenuItem IDs included in this menu
}
