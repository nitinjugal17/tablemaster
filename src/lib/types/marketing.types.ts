// src/lib/types/marketing.types.ts

export const ALL_OFFER_TYPES = ["discount_on_item", "combo_deal", "free_item_with_purchase", "seasonal_special"] as const;
export type OfferType = typeof ALL_OFFER_TYPES[number];

export interface Offer {
  id: string;
  title: string;
  description?: string;
  type: OfferType;
  details: string; // JSON string, e.g., {"itemId": "xyz", "discountPercent": 10}
  imageUrl?: string;
  aiHint?: string;
  validFrom: string; // ISO 8601
  validTo: string;   // ISO 8601
  isActive: boolean;
  linkedMenuItemIds?: string; // Comma-separated string of MenuItem IDs
}

export const ALL_DISCOUNT_CODE_TYPES = ['percentage', 'fixed_amount'] as const;
export type DiscountCodeType = typeof ALL_DISCOUNT_CODE_TYPES[number];

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountCodeType;
  value: number; // Percentage (e.g., 10 for 10%) or fixed amount in BASE_CURRENCY_CODE
  imageUrl?: string;
  aiHint?: string;
  validFrom: string; // ISO 8601
  validTo: string;   // ISO 8601
  usageLimit: number; // 0 for unlimited
  timesUsed: number;
  minOrderAmount?: number; // In BASE_CURRENCY_CODE
  isActive: boolean;
  description?: string;
  outletId?: string; // ID of the outlet this discount code belongs to, if any
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  aiHint?: string;      // For AI image generation/search
  linkUrl?: string;     // Optional URL the banner links to
  displayOrder: number; // For sorting, lower numbers appear first/higher
  isActive: boolean;
  validFrom?: string;   // ISO 8601, optional
  validTo?: string;     // ISO 8601, optional
}

export type ManagedImageContext =
  | 'menu_item'
  | 'offer'
  | 'banner'
  | 'ui_hero_bg'
  | 'ui_welcome_media'
  | 'ui_takeaway_cta_media'
  | 'ui_booking_cta_media'
  | 'ui_room_booking_cta_media'
  | 'ui_signature_dishes_bg'
  | 'ui_logo_invoice'
  | 'ui_logo_website'
  | 'ui_qr_order'
  | 'ui_qr_pay'
  | 'id_card_employee_photo'
  | 'id_card_signatory_image'
  | 'general_ui_other';

export const ALL_MANAGED_IMAGE_CONTEXTS: ManagedImageContext[] = [
  'menu_item', 'offer', 'banner', 'ui_hero_bg', 'ui_welcome_media',
  'ui_takeaway_cta_media', 'ui_booking_cta_media', 'ui_room_booking_cta_media', 
  'ui_signature_dishes_bg', 'ui_logo_invoice', 'ui_logo_website', 
  'ui_qr_order', 'ui_qr_pay', 'id_card_employee_photo', 
  'id_card_signatory_image', 'general_ui_other'
];

export interface ManagedImage {
  id: string;
  context: ManagedImageContext;
  entityId?: string; // e.g., menu_item_id if context is 'menu_item'
  imageUrl: string;
  aiPromptUsed?: string; // Prompt used if image was AI generated
  aiHint?: string; // Keywords for searching or re-generating
  altText?: string;
  uploadedAt: string; // ISO 8601 timestamp
}
