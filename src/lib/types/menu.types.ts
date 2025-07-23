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
  portionDetails: string; // Should always be a JSON string: '[{"name":"Regular","price":10}]'
  category: string;
  sacCode?: string; // New: For HSN/SAC code
  imageUrl: string;
  aiHint?: string;
  synonyms?: string;
  isAvailable: boolean; // Permanent availability
  isTemporarilyUnavailable?: boolean; // For daily stock management
  isSignatureDish?: boolean;
  isTodaysSpecial?: boolean;
  isMinibarItem?: boolean;
  employeeBonusAmount?: number; // New field for item-specific bonus
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
  sacCode?: string; // New: For HSN/SAC code at time of order
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
    addons: Addon[] | string; // Can be array or JSON string
}

export interface Menu {
    id: string;
    name: string; // e.g., "Lunch Menu", "Dinner Menu"
    description?: string;
    isActive: boolean;
    outletId?: string; // ID of the outlet this menu belongs to
    menuItemIds: string[] | string; // Can be array or JSON string
}
