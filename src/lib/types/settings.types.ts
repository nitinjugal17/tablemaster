
// src/lib/types/settings.types.ts
import type { Order } from './order.types';

export type CurrencyCode = 'USD' | 'INR' | 'GBP';
export type CurrencySymbol = '$' | '₹' | '£';

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: CurrencySymbol;
  name: string;
}

export const currencyOptions: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'USD ($) - US Dollar' },
  { code: 'INR', symbol: '₹', name: 'INR (₹) - Indian Rupee' },
  { code: 'GBP', symbol: '£', name: 'GBP (£) - British Pound' },
];

export const BASE_CURRENCY_CODE: CurrencyCode = 'INR'; // This is the currency prices are stored in

export type ConversionRates = {
  [sourceCurrency in CurrencyCode]?: Partial<Record<CurrencyCode, number>>;
};

export const DEFAULT_CONVERSION_RATES: ConversionRates = {
  INR: { // Rates from INR to other currencies
    USD: 0.012,
    GBP: 0.0095,
    INR: 1, // Self-rate
  },
};

export const ALL_AUTOMATED_REPORT_FREQUENCIES = ['daily', 'weekly', 'bi-weekly', 'monthly'] as const;
export type AutomatedReportFrequency = typeof ALL_AUTOMATED_REPORT_FREQUENCIES[number];


export interface ThemeColorPalette {
  background: string; // HSL format string e.g., "0 0% 100%"
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface Theme {
  id: string;
  name: string;
  lightColors: ThemeColorPalette;
  darkColors: ThemeColorPalette;
}

export const DEFAULT_LIGHT_THEME_COLORS: ThemeColorPalette = {
    background: "43 51% 89%",
    foreground: "0 0% 3.9%",
    primary: "7 57% 43%",
    primaryForeground: "0 0% 98%",
    secondary: "130 20% 52%",
    secondaryForeground: "0 0% 9%",
    accent: "130 20% 42%",
    accentForeground: "0 0% 98%",
    muted: "0 0% 96.1%",
    mutedForeground: "0 0% 45.1%",
    card: "43 51% 89%",
    cardForeground: "0 0% 3.9%",
    popover: "43 51% 89%",
    popoverForeground: "0 0% 3.9%",
    border: "0 0% 89.8%",
    input: "0 0% 89.8%",
    ring: "7 57% 43%",
};

export const DEFAULT_DARK_THEME_COLORS: ThemeColorPalette = {
    background: "0 0% 10%",
    foreground: "0 0% 95%",
    primary: "7 50% 50%",
    primaryForeground: "0 0% 98%",
    secondary: "130 15% 35%",
    secondaryForeground: "0 0% 95%",
    accent: "130 25% 50%",
    accentForeground: "0 0% 98%",
    muted: "0 0% 18%",
    mutedForeground: "0 0% 60%",
    card: "0 0% 12%",
    cardForeground: "0 0% 95%",
    popover: "0 0% 10%",
    popoverForeground: "0 0% 95%",
    border: "0 0% 20%",
    input: "0 0% 20%",
    ring: "7 50% 50%",
};

export const DEFAULT_INVOICE_SECTION_ORDER = [
  'companyHeader',
  'invoiceHeader',
  'orderDetails',
  'itemsTable',
  'totals',
  'taxInfo',
  'qrCodeOrder', 
  'qrCodePay',   
  'footerText1',
  'footerText2',
  'closingMessage',
] as const;
export type InvoiceSectionKey = typeof DEFAULT_INVOICE_SECTION_ORDER[number];


export interface MenuCategoryEnhancement {
  categoryId: string; 
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
}

export const DEFAULT_HOMEPAGE_LAYOUT = [
  { id: 'hero', name: 'Hero Banner', isVisible: true, order: 1 },
  { id: 'banners', name: 'Promotional Banners', isVisible: true, order: 2 },
  { id: 'features', name: 'Explore Menu Categories', isVisible: true, order: 3 },
  { id: 'todays_special', name: "Today's Specials", isVisible: true, order: 4 },
  { id: 'active_offers', name: 'Active Offers', isVisible: true, order: 5 },
  { id: 'active_discounts', name: 'Active Discounts', isVisible: true, order: 6 },
  { id: 'menu_highlights', name: 'Signature Dishes', isVisible: true, order: 7 },
  { id: 'table_grid', name: 'Table Showcase', isVisible: true, order: 8 },
  { id: 'room_grid', name: 'Room Showcase', isVisible: true, order: 9 },
  { id: 'booking_cta', name: 'Book a Table Call-to-Action', isVisible: true, order: 10 },
  { id: 'room_booking_cta', name: 'Book a Room Call-to-Action', isVisible: true, order: 11 },
  { id: 'takeaway_cta', name: 'Order Takeaway Call-to-Action', isVisible: true, order: 12 },
] as const;
export type HomepageSectionId = typeof DEFAULT_HOMEPAGE_LAYOUT[number]['id'];

export interface HomepageSectionConfig {
  id: HomepageSectionId;
  name: string; 
  isVisible: boolean;
  order: number; 
}


export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
] as const;
export type AppLanguage = typeof SUPPORTED_LANGUAGES[number]['code'];

export type EstablishmentType = 'standalone' | 'hotel';
export type HotelTariffBracket = 'below_7500' | 'above_7500';

export interface SoundNotificationSettings {
    playOnNewOrder: boolean;
    playOnNewBooking: boolean;
    playOnChefUpdate: boolean;
}

export type ThermalTextStyle = 'normal' | 'bold' | 'large' | 'large-bold';

export interface InvoiceSetupSettings {
  companyName: string;
  legalName?: string; // New: For HUF legal name
  companyAddress?: string;
  companyPhone?: string;
  companyLogoUrl: string; 
  invoiceHeaderText?: string;
  panNumber?: string; // Changed to optional
  gstNumber?: string; // Changed to optional
  fssaiNumber?: string; // Changed to optional
  scanForOrderQRUrl: string; 
  scanForPayQRUrl: string;   
  invoiceFooterText1?: string;
  invoiceFooterText2?: string;
  currencyCode: CurrencyCode; 
  currencySymbol: CurrencySymbol; 
  gstPercentage?: number; // Kept for fallback/simple cases
  vatPercentage?: number;
  cessPercentage?: number;
  serviceChargePercentage?: number;
  isCompositionScheme?: boolean;
  establishmentType?: EstablishmentType;
  hotelTariffBracket?: HotelTariffBracket;
  printElements: {
    showLogo: boolean;
    showInvoiceHeaderText: boolean;
    showScanForOrderQR: boolean;
    showScanForPayQR: boolean;
    showPanNumber: boolean;
    showGstNumber: boolean;
    showFssaiNumber: boolean;
    showInvoiceFooterText1: boolean;
    showInvoiceFooterText2: boolean;
    showCompanyAddress: boolean;
    showCompanyPhone: boolean;
  };
  thermalHeaderTextSize?: ThermalTextStyle;
  thermalItemTextSize?: ThermalTextStyle;
  thermalTotalTextSize?: ThermalTextStyle;
  websiteHeaderLogoUrl?: string; 
  heroBackgroundMediaUrl?: string; 
  welcomeMediaUrl?: string; 
  orderTakeawayMediaUrl?: string; 
  bookATableMediaUrl?: string; 
  roomBookingMediaUrl?: string;
  signatureDishBackgroundMediaUrl?: string; 
  operatingHours?: {
    monFriOpen?: string; 
    monFriClose?: string; 
    satOpen?: string;
    satClose?: string;
    sunOpen?: string;
    sunClose?: string;
  };
  defaultThermalPrinterId?: string;
  defaultChefKotPrinterId?: string;
  defaultStockKotPrinterId?: string;
  chefKotLanguage?: AppLanguage;
  stockKotLanguage?: AppLanguage;
  enableAutoKotPrinting?: boolean; // New
  autoKotPrintMode?: 'immediate' | 'batch'; // New
  kotBatchPrintThreshold?: number; // New
  autoGenerateInvoiceFooterQuote: boolean;
  invoiceFooterQuoteLanguage: string; 
  idCardAddressLine?: string; 
  idCardDefaultSignatory?: string; 
  idCardReturnInstructions?: string;
  idCardPropertyOfLine?: string; 
  autoLogoutTimeoutMinutes?: number;
  dailyOrderLimitsByRole?: string; // JSON string like '{"user": 5, "admin": 0}'
  globalDisplayLanguage?: AppLanguage; // New field
  homepageLayoutConfig?: string; 
  invoiceSectionOrder?: string; 
  enableAutomatedExpenseInventoryReport?: boolean;
  automatedReportFrequency?: AutomatedReportFrequency;
  automatedReportRecipientEmail?: string;
  availableThemes?: string; 
  activeThemeId?: string;
  footerAboutText?: string;
  footerContactAddress?: string;
  footerContactEmail?: string;
  footerCopyrightText?: string;
  footerFacebookUrl?: string;
  footerInstagramUrl?: string;
  footerTwitterUrl?: string;
  termsAndConditionsContent?: string;
  disclaimerContent?: string;
  userGuideContent?: string;
  faqContent?: string; 
  menuCategoryEnhancements?: string; 
  showCalculatedCostOnInvoiceAdmin?: boolean;
  showNutritionalInfoOnInvoice?: boolean; 
  dailyRevenueThreshold?: number;
  employeeBonusAmount?: number;
  bonusPercentageAboveThreshold?: number;
  autoApproveNewOrders?: boolean;
  autoApproveTableBookings?: boolean;
  autoApproveRoomBookings?: boolean;
  loyaltyProgramEnabled?: boolean;
  pointsPerCurrencyUnit?: number; // e.g., 1 point per 1 currency units spent
  pointValueInCurrency?: number; // e.g., 1 point = 0.5 currency units on redemption
  customerInfoPin?: string;
  completedOrderPin?: string; // PIN to edit completed/cancelled orders
  masterDateRangeFrom?: string; // ISO Date String
  masterDateRangeTo?: string; // ISO Date String
  soundNotifications?: SoundNotificationSettings;
}

export const defaultInvoiceSetupSettings: InvoiceSetupSettings = {
    companyName: "TableMaster Demo Restaurant",
    legalName: "TableMaster HUF",
    companyAddress: "123 Culinary Lane, Foodville, FS 54321",
    companyPhone: "(123) 456-7890",
    companyLogoUrl: "https://placehold.co/200x80.png?text=Invoice+Logo",
    invoiceHeaderText: "🙏 Jai Shree Ram 🙏",
    panNumber: "ABCDE1234F",
    gstNumber: "22ABCDE1234F1Z5",
    fssaiNumber: "10012345678901",
    scanForOrderQRUrl: "https://placehold.co/80x80.png?text=Order+QR",
    scanForPayQRUrl: "https://placehold.co/80x80.png?text=Pay+QR",
    invoiceFooterText1: "May your food be blessed and your day be joyful!",
    invoiceFooterText2: "All items subject to availability. Prices inclusive of all taxes unless stated otherwise. Please inform us of any allergies.",
    currencyCode: 'INR',
    currencySymbol: '₹',
    gstPercentage: 5,
    vatPercentage: 0,
    cessPercentage: 0,
    serviceChargePercentage: 10,
    isCompositionScheme: false,
    establishmentType: 'standalone',
    hotelTariffBracket: 'below_7500',
    printElements: {
        showLogo: true,
        showInvoiceHeaderText: true,
        showScanForOrderQR: true,
        showScanForPayQR: true,
        showPanNumber: true,
        showGstNumber: true,
        showFssaiNumber: true,
        showInvoiceFooterText1: true,
        showInvoiceFooterText2: true,
        showCompanyAddress: true,
        showCompanyPhone: true,
    },
    thermalHeaderTextSize: 'large-bold',
    thermalItemTextSize: 'normal',
    thermalTotalTextSize: 'large-bold',
    websiteHeaderLogoUrl: "https://res.cloudinary.com/doqfbvwze/image/upload/v1747575704/pngtree-shree-logo-design-with-lord-ganesha-symbol-png-image_6583795_d9opwb.png",
    heroBackgroundMediaUrl: "https://placehold.co/1920x1080.png?text=Hero+Background",
    welcomeMediaUrl: "https://placehold.co/800x600.png?text=Welcome+Media",
    orderTakeawayMediaUrl: "https://placehold.co/600x400.png?text=Takeaway+Section",
    bookATableMediaUrl: "https://placehold.co/600x400.png?text=Booking+Section",
    roomBookingMediaUrl: "https://placehold.co/600x400.png?text=Room+Booking+Section",
    signatureDishBackgroundMediaUrl: "https://placehold.co/1200x400.png?text=Signature+Dishes+BG",
    operatingHours: {
        monFriOpen: "11:00",
        monFriClose: "22:00",
        satOpen: "10:00",
        satClose: "23:00",
        sunOpen: "12:00",
        sunClose: "21:00",
    },
    defaultThermalPrinterId: undefined,
    defaultChefKotPrinterId: undefined,
    defaultStockKotPrinterId: undefined,
    chefKotLanguage: 'en',
    stockKotLanguage: 'en',
    enableAutoKotPrinting: false,
    autoKotPrintMode: 'immediate',
    kotBatchPrintThreshold: 2,
    autoGenerateInvoiceFooterQuote: false,
    invoiceFooterQuoteLanguage: 'en',
    idCardAddressLine: "",
    idCardDefaultSignatory: "Surendra Singh (CEO)",
    idCardReturnInstructions: "If found, please return to [Your Company Name] at the address above or call [Your Phone Number].",
    idCardPropertyOfLine: "This card is the property of [Your Company Name LLC].",
    autoLogoutTimeoutMinutes: 30,
    dailyOrderLimitsByRole: JSON.stringify({ user: 5, admin: 0 }), // Default to 5 for users, unlimited for admin
    globalDisplayLanguage: 'en', // Default global language
    homepageLayoutConfig: JSON.stringify(DEFAULT_HOMEPAGE_LAYOUT),
    invoiceSectionOrder: JSON.stringify(DEFAULT_INVOICE_SECTION_ORDER),
    enableAutomatedExpenseInventoryReport: false,
    automatedReportFrequency: 'weekly',
    automatedReportRecipientEmail: '',
    availableThemes: JSON.stringify([
      {
        id: 'default-theme',
        name: 'Default Theme',
        lightColors: DEFAULT_LIGHT_THEME_COLORS,
        darkColors: DEFAULT_DARK_THEME_COLORS,
      }
    ]),
    activeThemeId: 'default-theme',
    footerAboutText: "Savor the moments, one dish at a time. TableMaster helps you connect with your favorite culinary experiences.",
    footerContactAddress: "123 Restaurant St, Food City",
    footerContactEmail: "info@tablemaster.example.com",
    footerCopyrightText: "© {year} {companyName}. All rights reserved. Crafted with passion.",
    footerFacebookUrl: "#",
    footerInstagramUrl: "#",
    footerTwitterUrl: "#",
    termsAndConditionsContent: "&lt;h1&gt;Terms and Conditions&lt;/h1&gt;&lt;p&gt;Welcome to TableMaster! These terms and conditions outline the rules and regulations for the use of TableMaster's Website, located at tablemaster.example.com.&lt;/p&gt;&lt;p&gt;By accessing this website we assume you accept these terms and conditions. Do not continue to use TableMaster if you do not agree to take all of the terms and conditions stated on this page.&lt;/p&gt;&lt;h2&gt;Cookies&lt;/h2&gt;&lt;p&gt;We employ the use of cookies. By accessing TableMaster, you agreed to use cookies in agreement with the TableMaster's Privacy Policy.&lt;/p&gt;&lt;h2&gt;License&lt;/h2&gt;&lt;p&gt;Unless otherwise stated, TableMaster and/or its licensors own the intellectual property rights for all material on TableMaster. All intellectual property rights are reserved. You may access this from TableMaster for your own personal use subjected to restrictions set in these terms and conditions.&lt;/p&gt;",
    disclaimerContent: "&lt;h1&gt;Disclaimer&lt;/h1&gt;&lt;p&gt;The information provided by TableMaster on tablemaster.example.com is for general informational purposes only. All information on the Site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability or completeness of any information on the Site.&lt;/p&gt;&lt;p&gt;UNDER NO CIRCUMSTANCE SHALL WE HAVE ANY LIABILITY TO YOU FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF THE SITE OR RELIANCE ON ANY INFORMATION ON THE SITE. YOUR USE OF THE SITE AND YOUR RELIANCE ON ANY INFORMATION ON THE SITE IS SOLELY AT YOUR OWN RISK.&lt;/p&gt;",
    userGuideContent: "",
    faqContent: "[]",
    menuCategoryEnhancements: JSON.stringify([]),
    showCalculatedCostOnInvoiceAdmin: false,
    showNutritionalInfoOnInvoice: false, 
    dailyRevenueThreshold: 50000,
    employeeBonusAmount: 2500,
    bonusPercentageAboveThreshold: 10,
    autoApproveNewOrders: false,
    autoApproveTableBookings: false,
    autoApproveRoomBookings: false,
    loyaltyProgramEnabled: true,
    pointsPerCurrencyUnit: 1, // e.g., 1 point per 1 currency units spent
    pointValueInCurrency: 0.1, // e.g., 1 point = 0.5 currency units on redemption
    customerInfoPin: "1234",
    completedOrderPin: "0000",
    masterDateRangeFrom: undefined,
    masterDateRangeTo: undefined,
    soundNotifications: {
        playOnNewOrder: true,
        playOnNewBooking: true,
        playOnChefUpdate: false,
    }
};

export interface NotificationSettings {
  admin: {
    notifyOnNewOrder: boolean;
    notifyOnNewBooking: boolean;
    notifyOnNewUserSignup: boolean;
    notifyOnNewFeedback: boolean;
  };
  user: {
    emailOnOrderConfirmation: boolean;
    emailOnOrderStatusUpdate: boolean;
    emailOnOrderCompletion: boolean;
    emailOnBookingConfirmation: boolean; 
    emailOnBookingStatusUpdate: boolean; 
  };
}

export const defaultNotificationSettings: NotificationSettings = {
  admin: {
    notifyOnNewOrder: true,
    notifyOnNewBooking: true,
    notifyOnNewUserSignup: true,
    notifyOnNewFeedback: true,
  },
  user: {
    emailOnOrderConfirmation: true,
    emailOnOrderStatusUpdate: true,
    emailOnOrderCompletion: true,
    emailOnBookingConfirmation: true, 
    emailOnBookingStatusUpdate: true,
  },
};

export interface PrinterSetting {
  id: string;
  name: string;
  connectionType: 'network' | 'usb' | 'bluetooth' | 'system';
  ipAddress: string; 
  port: string; 
  paperWidth: string; 
  autoCut: 'none' | 'partial_cut' | 'full_cut';
  linesBeforeCut: '0' | '1' | '2' | '3' | '4' | '5';
  openCashDrawer: 'disabled' | 'before_print' | 'after_print';
  dpi: string; 
}

// Type for printing a KOT
export interface PrintableKOTData {
  order?: Order;
  orders?: Order[]; // For consolidated KOT
}

// Add a new type for printable data with adjustments
export interface PrintableInvoiceData extends InvoiceSetupSettings {
  order: Order;
  discount?: {
    type: 'percentage' | 'fixed_amount';
    value: number;
  };
  language?: 'en' | 'hi' | 'bn';
}

export interface PrintableInvoiceDataWithAdjustments extends PrintableInvoiceData {
  discount?: {
    type: 'percentage' | 'fixed_amount';
    value: number;
  };
  language?: 'en' | 'hi' | 'bn';
}
