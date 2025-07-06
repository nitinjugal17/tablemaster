
// src/app/actions/data-management/general-settings-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from './_csv-base-actions';
import { GENERAL_SETTINGS_HEADERS } from './_csv-headers';
import type { InvoiceSetupSettings, Theme, InvoiceSectionKey, MenuCategoryEnhancement, AppLanguage } from '@/lib/types';
import { defaultInvoiceSetupSettings, currencyOptions, ALL_AUTOMATED_REPORT_FREQUENCIES, DEFAULT_HOMEPAGE_LAYOUT, DEFAULT_LIGHT_THEME_COLORS, DEFAULT_DARK_THEME_COLORS, SUPPORTED_LANGUAGES, DEFAULT_INVOICE_SECTION_ORDER } from '@/lib/types';

const generalSettingsCsvPath = path.join(dataDir, 'general-settings.csv');

export async function getGeneralSettings(): Promise<InvoiceSetupSettings> {
  try {
    const data = await readCsvFile<any>(generalSettingsCsvPath, GENERAL_SETTINGS_HEADERS);
    if (data.length === 0) {
      console.warn('[General Settings Action] general-settings.csv is empty or not found, returning default settings and attempting to create file.');
      await saveGeneralSettings(defaultInvoiceSetupSettings); 
      return JSON.parse(JSON.stringify(defaultInvoiceSetupSettings)); 
    }
    const settings = data[0];
    const deserializedSettings: Partial<InvoiceSetupSettings> = { ...settings };
    
    deserializedSettings.gstPercentage = parseFloat(String(settings.gstPercentage)) || 0;
    deserializedSettings.vatPercentage = parseFloat(String(settings.vatPercentage)) || 0;
    deserializedSettings.cessPercentage = parseFloat(String(settings.cessPercentage)) || 0;
    deserializedSettings.defaultThermalPrinterId = settings.defaultThermalPrinterId || undefined;
    deserializedSettings.autoGenerateInvoiceFooterQuote = String(settings.autoGenerateInvoiceFooterQuote).toLowerCase() === 'true';
    deserializedSettings.invoiceFooterQuoteLanguage = settings.invoiceFooterQuoteLanguage || 'en';
    deserializedSettings.idCardAddressLine = settings.idCardAddressLine || "";
    deserializedSettings.idCardDefaultSignatory = settings.idCardDefaultSignatory || "";
    deserializedSettings.idCardReturnInstructions = settings.idCardReturnInstructions || "";
    deserializedSettings.idCardPropertyOfLine = settings.idCardPropertyOfLine || "";
    deserializedSettings.autoLogoutTimeoutMinutes = Number(settings.autoLogoutTimeoutMinutes) || defaultInvoiceSetupSettings.autoLogoutTimeoutMinutes;
    deserializedSettings.dailyOrderLimitsByRole = settings.dailyOrderLimitsByRole || defaultInvoiceSetupSettings.dailyOrderLimitsByRole;
    deserializedSettings.globalDisplayLanguage = SUPPORTED_LANGUAGES.find(l => l.code === settings.globalDisplayLanguage)?.code || 'en';
    
    deserializedSettings.homepageLayoutConfig = settings.homepageLayoutConfig && typeof settings.homepageLayoutConfig === 'string' ? settings.homepageLayoutConfig : JSON.stringify(DEFAULT_HOMEPAGE_LAYOUT);
    deserializedSettings.invoiceSectionOrder = settings.invoiceSectionOrder && typeof settings.invoiceSectionOrder === 'string' ? settings.invoiceSectionOrder : JSON.stringify(DEFAULT_INVOICE_SECTION_ORDER);
    
    deserializedSettings.enableAutomatedExpenseInventoryReport = String(settings.enableAutomatedExpenseInventoryReport).toLowerCase() === 'true';
    deserializedSettings.automatedReportFrequency = ALL_AUTOMATED_REPORT_FREQUENCIES.includes(settings.automatedReportFrequency) ? settings.automatedReportFrequency : 'weekly';
    deserializedSettings.automatedReportRecipientEmail = settings.automatedReportRecipientEmail || '';
    deserializedSettings.activeThemeId = settings.activeThemeId || 'default-theme';
    deserializedSettings.showCalculatedCostOnInvoiceAdmin = String(settings.showCalculatedCostOnInvoiceAdmin).toLowerCase() === 'true';
    deserializedSettings.showNutritionalInfoOnInvoice = String(settings.showNutritionalInfoOnInvoice).toLowerCase() === 'true';
    deserializedSettings.dailyRevenueThreshold = Number(settings.dailyRevenueThreshold) || defaultInvoiceSetupSettings.dailyRevenueThreshold;
    deserializedSettings.employeeBonusAmount = Number(settings.employeeBonusAmount) || defaultInvoiceSetupSettings.employeeBonusAmount;
    deserializedSettings.bonusPercentageAboveThreshold = Number(settings.bonusPercentageAboveThreshold) || defaultInvoiceSetupSettings.bonusPercentageAboveThreshold;


    if (typeof settings.printElements === 'string') {
      try { deserializedSettings.printElements = JSON.parse(settings.printElements); } 
      catch (e) { deserializedSettings.printElements = defaultInvoiceSetupSettings.printElements; }
    } else if (typeof settings.printElements !== 'object' || settings.printElements === null) {
        deserializedSettings.printElements = defaultInvoiceSetupSettings.printElements;
    }

    if (typeof settings.operatingHours === 'string') {
      try { deserializedSettings.operatingHours = JSON.parse(settings.operatingHours); } 
      catch (e) { deserializedSettings.operatingHours = defaultInvoiceSetupSettings.operatingHours; }
    } else if (typeof settings.operatingHours !== 'object' || settings.operatingHours === null) {
       deserializedSettings.operatingHours = defaultInvoiceSetupSettings.operatingHours;
    }

    if (typeof settings.availableThemes === 'string') {
        try {
            const parsedThemes = JSON.parse(settings.availableThemes);
            if (Array.isArray(parsedThemes) && parsedThemes.every((th: any) => typeof th === 'object' && th.id && th.name && th.lightColors && th.darkColors)) {
                deserializedSettings.availableThemes = settings.availableThemes;
            } else { throw new Error("availableThemes is not a valid Theme array string"); }
        } catch (e) {
            deserializedSettings.availableThemes = JSON.stringify([{ id: 'default-theme', name: 'Default Theme', lightColors: DEFAULT_LIGHT_THEME_COLORS, darkColors: DEFAULT_DARK_THEME_COLORS }]);
        }
    } else {
         deserializedSettings.availableThemes = JSON.stringify([{ id: 'default-theme', name: 'Default Theme', lightColors: DEFAULT_LIGHT_THEME_COLORS, darkColors: DEFAULT_DARK_THEME_COLORS }]);
    }
    
    if (typeof settings.menuCategoryEnhancements === 'string') {
      try {
        const parsedEnhancements = JSON.parse(settings.menuCategoryEnhancements);
        if (Array.isArray(parsedEnhancements)) {
          deserializedSettings.menuCategoryEnhancements = settings.menuCategoryEnhancements;
        } else {
          deserializedSettings.menuCategoryEnhancements = JSON.stringify([]);
        }
      } catch (e) {
        deserializedSettings.menuCategoryEnhancements = JSON.stringify([]);
      }
    } else {
      deserializedSettings.menuCategoryEnhancements = JSON.stringify([]);
    }

    deserializedSettings.userGuideContent = settings.userGuideContent || defaultInvoiceSetupSettings.userGuideContent;
    deserializedSettings.faqContent = settings.faqContent || defaultInvoiceSetupSettings.faqContent;
    deserializedSettings.termsAndConditionsContent = settings.termsAndConditionsContent || defaultInvoiceSetupSettings.termsAndConditionsContent;
    deserializedSettings.disclaimerContent = settings.disclaimerContent || defaultInvoiceSetupSettings.disclaimerContent;


    return { ...defaultInvoiceSetupSettings, ...deserializedSettings };
  } catch (error) {
    console.error('[General Settings Action] Error reading general-settings.csv, returning default settings:', (error as Error).message);
    return JSON.parse(JSON.stringify(defaultInvoiceSetupSettings)); 
  }
}

export async function saveGeneralSettings(settings: InvoiceSetupSettings): Promise<{ success: boolean; message: string }> {
  console.log('[General Settings Action] Attempting to save general settings CSV.');
  try {
    const settingsForCsv = {
      ...settings,
      gstPercentage: settings.gstPercentage || 0,
      vatPercentage: settings.vatPercentage || 0,
      cessPercentage: settings.cessPercentage || 0,
      defaultThermalPrinterId: settings.defaultThermalPrinterId || "",
      autoGenerateInvoiceFooterQuote: String(settings.autoGenerateInvoiceFooterQuote || false),
      invoiceFooterQuoteLanguage: settings.invoiceFooterQuoteLanguage || 'en',
      printElements: JSON.stringify(settings.printElements || {}),
      operatingHours: JSON.stringify(settings.operatingHours || {}),
      idCardAddressLine: settings.idCardAddressLine || "",
      idCardDefaultSignatory: settings.idCardDefaultSignatory || "",
      idCardReturnInstructions: settings.idCardReturnInstructions || "",
      idCardPropertyOfLine: settings.idCardPropertyOfLine || "",
      autoLogoutTimeoutMinutes: Number(settings.autoLogoutTimeoutMinutes) || 0,
      dailyOrderLimitsByRole: settings.dailyOrderLimitsByRole || JSON.stringify({ user: 5, admin: 0 }),
      globalDisplayLanguage: settings.globalDisplayLanguage || 'en',
      homepageLayoutConfig: settings.homepageLayoutConfig || JSON.stringify(DEFAULT_HOMEPAGE_LAYOUT),
      invoiceSectionOrder: settings.invoiceSectionOrder || JSON.stringify(DEFAULT_INVOICE_SECTION_ORDER),
      enableAutomatedExpenseInventoryReport: String(settings.enableAutomatedExpenseInventoryReport || false),
      automatedReportFrequency: settings.automatedReportFrequency || 'weekly',
      automatedReportRecipientEmail: settings.automatedReportRecipientEmail || '',
      availableThemes: typeof settings.availableThemes === 'string' ? settings.availableThemes : JSON.stringify(settings.availableThemes || [{ id: 'default-theme', name: 'Default Theme', lightColors: DEFAULT_LIGHT_THEME_COLORS, darkColors: DEFAULT_DARK_THEME_COLORS }]),
      activeThemeId: settings.activeThemeId || 'default-theme',
      footerAboutText: settings.footerAboutText || defaultInvoiceSetupSettings.footerAboutText,
      footerContactAddress: settings.footerContactAddress || defaultInvoiceSetupSettings.footerContactAddress,
      footerContactEmail: settings.footerContactEmail || defaultInvoiceSetupSettings.footerContactEmail,
      footerCopyrightText: settings.footerCopyrightText || defaultInvoiceSetupSettings.footerCopyrightText,
      footerFacebookUrl: settings.footerFacebookUrl || defaultInvoiceSetupSettings.footerFacebookUrl,
      footerInstagramUrl: settings.footerInstagramUrl || defaultInvoiceSetupSettings.footerInstagramUrl,
      footerTwitterUrl: settings.footerTwitterUrl || defaultInvoiceSetupSettings.footerTwitterUrl,
      termsAndConditionsContent: settings.termsAndConditionsContent || defaultInvoiceSetupSettings.termsAndConditionsContent,
      disclaimerContent: settings.disclaimerContent || defaultInvoiceSetupSettings.disclaimerContent,
      userGuideContent: settings.userGuideContent || defaultInvoiceSetupSettings.userGuideContent,
      faqContent: settings.faqContent || defaultInvoiceSetupSettings.faqContent,
      menuCategoryEnhancements: settings.menuCategoryEnhancements || JSON.stringify([]),
      showCalculatedCostOnInvoiceAdmin: String(settings.showCalculatedCostOnInvoiceAdmin || false),
      showNutritionalInfoOnInvoice: String(settings.showNutritionalInfoOnInvoice || false),
      dailyRevenueThreshold: Number(settings.dailyRevenueThreshold) || 0,
      employeeBonusAmount: Number(settings.employeeBonusAmount) || 0,
      bonusPercentageAboveThreshold: Number(settings.bonusPercentageAboveThreshold) || 0,
    };
    
    const headers = GENERAL_SETTINGS_HEADERS.trim().split(',');
    return overwriteCsvFile(generalSettingsCsvPath, [settingsForCsv], headers);
  } catch (error) {
    console.error(`[General Settings Action] Error processing/saving general settings CSV: ${(error as Error).message}`);
    return { success: false, message: `Error processing/saving general settings CSV: ${(error as Error).message}` };
  }
}

export async function downloadGeneralSettingsCsv(): Promise<string> {
  try {
    const settings = await getGeneralSettings();
    const settingsForCsv = {
      ...settings,
      autoGenerateInvoiceFooterQuote: String(settings.autoGenerateInvoiceFooterQuote || false),
      invoiceFooterQuoteLanguage: settings.invoiceFooterQuoteLanguage || 'en',
      printElements: JSON.stringify(settings.printElements || {}),
      operatingHours: JSON.stringify(settings.operatingHours || {}),
      idCardAddressLine: settings.idCardAddressLine || "",
      idCardDefaultSignatory: settings.idCardDefaultSignatory || "",
      idCardReturnInstructions: settings.idCardReturnInstructions || "",
      idCardPropertyOfLine: settings.idCardPropertyOfLine || "",
      autoLogoutTimeoutMinutes: Number(settings.autoLogoutTimeoutMinutes) || 0,
      dailyOrderLimitsByRole: settings.dailyOrderLimitsByRole || JSON.stringify({ user: 5, admin: 0 }),
      globalDisplayLanguage: settings.globalDisplayLanguage || 'en',
      homepageLayoutConfig: settings.homepageLayoutConfig || JSON.stringify(DEFAULT_HOMEPAGE_LAYOUT),
      invoiceSectionOrder: settings.invoiceSectionOrder || JSON.stringify(DEFAULT_INVOICE_SECTION_ORDER),
      enableAutomatedExpenseInventoryReport: String(settings.enableAutomatedExpenseInventoryReport || false),
      automatedReportFrequency: settings.automatedReportFrequency || 'weekly',
      automatedReportRecipientEmail: settings.automatedReportRecipientEmail || '',
      availableThemes: typeof settings.availableThemes === 'string' ? settings.availableThemes : JSON.stringify(settings.availableThemes || [{ id: 'default-theme', name: 'Default Theme', lightColors: DEFAULT_LIGHT_THEME_COLORS, darkColors: DEFAULT_DARK_THEME_COLORS }]),
      activeThemeId: settings.activeThemeId || 'default-theme',
      footerAboutText: settings.footerAboutText || defaultInvoiceSetupSettings.footerAboutText,
      footerContactAddress: settings.footerContactAddress || defaultInvoiceSetupSettings.footerContactAddress,
      footerContactEmail: settings.footerContactEmail || defaultInvoiceSetupSettings.footerContactEmail,
      footerCopyrightText: settings.footerCopyrightText || defaultInvoiceSetupSettings.footerCopyrightText,
      footerFacebookUrl: settings.footerFacebookUrl || defaultInvoiceSetupSettings.footerFacebookUrl,
      footerInstagramUrl: settings.footerInstagramUrl || defaultInvoiceSetupSettings.footerInstagramUrl,
      footerTwitterUrl: settings.footerTwitterUrl || defaultInvoiceSetupSettings.footerTwitterUrl,
      termsAndConditionsContent: settings.termsAndConditionsContent || defaultInvoiceSetupSettings.termsAndConditionsContent,
      disclaimerContent: settings.disclaimerContent || defaultInvoiceSetupSettings.disclaimerContent,
      userGuideContent: settings.userGuideContent || defaultInvoiceSetupSettings.userGuideContent,
      faqContent: settings.faqContent || defaultInvoiceSetupSettings.faqContent,
      menuCategoryEnhancements: settings.menuCategoryEnhancements || JSON.stringify([]),
      showCalculatedCostOnInvoiceAdmin: String(settings.showCalculatedCostOnInvoiceAdmin || false),
      showNutritionalInfoOnInvoice: String(settings.showNutritionalInfoOnInvoice || false),
      dailyRevenueThreshold: Number(settings.dailyRevenueThreshold) || 0,
      employeeBonusAmount: Number(settings.employeeBonusAmount) || 0,
      bonusPercentageAboveThreshold: Number(settings.bonusPercentageAboveThreshold) || 0,
    };
    const headers = GENERAL_SETTINGS_HEADERS.trim().split(',');
    return Papa.unparse([settingsForCsv], { header: true, columns: headers });
  } catch (error) {
    console.error(`[General Settings Action] Error generating GeneralSettings CSV for download: ${(error as Error).message}`);
    return GENERAL_SETTINGS_HEADERS;
  }
}

export async function uploadGeneralSettingsCsv(csvString: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
        return { success: false, message: `CSV parsing errors: ${errorMessages}. File not saved.` };
    }
    if (parsed.data.length === 0) return { success: false, message: "Uploaded CSV is empty. No settings updated." };
    if (parsed.data.length > 1) return { success: false, message: "CSV should contain only one row for settings. File not saved." };

    const rawSettings = parsed.data[0];
    const settingsToSave: Partial<InvoiceSetupSettings> = {};
    for (const key of Object.keys(defaultInvoiceSetupSettings) as Array<keyof InvoiceSetupSettings>) {
        if (rawSettings.hasOwnProperty(key)) {
            if (key === 'gstPercentage' || key === 'vatPercentage' || key === 'cessPercentage' || key === 'autoLogoutTimeoutMinutes' || key === 'dailyRevenueThreshold' || key === 'employeeBonusAmount' || key === 'bonusPercentageAboveThreshold') {
                 (settingsToSave as any)[key] = Number(rawSettings[key]) || 0;
                 if (key === 'autoLogoutTimeoutMinutes' && (settingsToSave as any)[key] < 0) (settingsToSave as any)[key] = 0;
            } else if (key === 'dailyOrderLimitsByRole') {
                (settingsToSave as any)[key] = rawSettings[key] || JSON.stringify({ user: 5, admin: 0 });
            } else if (key === 'autoGenerateInvoiceFooterQuote' || key === 'enableAutomatedExpenseInventoryReport' || key === 'showCalculatedCostOnInvoiceAdmin' || key === 'showNutritionalInfoOnInvoice') {
                (settingsToSave as any)[key] = String(rawSettings[key]).toLowerCase() === 'true';
            } else if (key === 'invoiceFooterQuoteLanguage') {
                 (settingsToSave as any)[key] = rawSettings[key] || 'en';
            } else if (key === 'globalDisplayLanguage') {
                (settingsToSave as any)[key] = SUPPORTED_LANGUAGES.find(l => l.code === rawSettings[key])?.code || 'en';
            } else if (key === 'automatedReportFrequency') {
                (settingsToSave as any)[key] = ALL_AUTOMATED_REPORT_FREQUENCIES.includes(rawSettings[key]) ? rawSettings[key] : 'weekly';
            } else if (key === 'automatedReportRecipientEmail') {
                (settingsToSave as any)[key] = rawSettings[key] || '';
            } else if (key === 'printElements' || key === 'operatingHours' || key === 'availableThemes' || key === 'faqContent' || key === 'homepageLayoutConfig' || key === 'invoiceSectionOrder' || key === 'menuCategoryEnhancements' || key === 'userGuideContent' || key === 'termsAndConditionsContent' || key === 'disclaimerContent') {
                try {
                    if (typeof rawSettings[key] === 'string' && (rawSettings[key].startsWith('{') || rawSettings[key].startsWith('['))) {
                        (settingsToSave as any)[key] = JSON.parse(rawSettings[key]);
                    } else {
                         (settingsToSave as any)[key] = (defaultInvoiceSetupSettings as any)[key];
                    }
                } catch (e) {
                    (settingsToSave as any)[key] = (defaultInvoiceSetupSettings as any)[key]; 
                }
            } else if (key === 'currencyCode' || key === 'currencySymbol') {
                if (currencyOptions.some(opt => opt.code === rawSettings[key]) || currencyOptions.some(opt => opt.symbol === rawSettings[key])) {
                    (settingsToSave as any)[key] = rawSettings[key];
                } else { (settingsToSave as any)[key] = defaultInvoiceSetupSettings[key]; }
            } else if (['footerAboutText', 'footerContactAddress', 'footerContactEmail', 'footerCopyrightText', 'footerFacebookUrl', 'footerInstagramUrl', 'footerTwitterUrl'].includes(key)) {
                (settingsToSave as any)[key] = rawSettings[key] || (defaultInvoiceSetupSettings as any)[key] || "";
            }
             else { (settingsToSave as any)[key] = rawSettings[key]; }
        }
    }
    const finalSettings = { ...defaultInvoiceSetupSettings, ...settingsToSave };
    if (typeof finalSettings.homepageLayoutConfig !== 'string') finalSettings.homepageLayoutConfig = JSON.stringify(DEFAULT_HOMEPAGE_LAYOUT);
    if (typeof finalSettings.invoiceSectionOrder !== 'string') finalSettings.invoiceSectionOrder = JSON.stringify(DEFAULT_INVOICE_SECTION_ORDER);
    if (typeof finalSettings.availableThemes !== 'string') finalSettings.availableThemes = JSON.stringify([{ id: 'default-theme', name: 'Default Theme', lightColors: DEFAULT_LIGHT_THEME_COLORS, darkColors: DEFAULT_DARK_THEME_COLORS }]);
    if (typeof finalSettings.faqContent !== 'string') finalSettings.faqContent = defaultInvoiceSetupSettings.faqContent;
    if (typeof finalSettings.userGuideContent !== 'string') finalSettings.userGuideContent = defaultInvoiceSetupSettings.userGuideContent;
    if (typeof finalSettings.termsAndConditionsContent !== 'string') finalSettings.termsAndConditionsContent = defaultInvoiceSetupSettings.termsAndConditionsContent;
    if (typeof finalSettings.disclaimerContent !== 'string') finalSettings.disclaimerContent = defaultInvoiceSetupSettings.disclaimerContent;
    if (typeof finalSettings.menuCategoryEnhancements !== 'string') finalSettings.menuCategoryEnhancements = JSON.stringify([]);
    if (typeof finalSettings.dailyOrderLimitsByRole !== 'string') finalSettings.dailyOrderLimitsByRole = JSON.stringify({ user: 5, admin: 0 });

    if (finalSettings.autoLogoutTimeoutMinutes === undefined) finalSettings.autoLogoutTimeoutMinutes = defaultInvoiceSetupSettings.autoLogoutTimeoutMinutes;
    if (finalSettings.defaultThermalPrinterId === undefined) finalSettings.defaultThermalPrinterId = defaultInvoiceSetupSettings.defaultThermalPrinterId;
    if (finalSettings.globalDisplayLanguage === undefined) finalSettings.globalDisplayLanguage = 'en';
    if (finalSettings.showCalculatedCostOnInvoiceAdmin === undefined) finalSettings.showCalculatedCostOnInvoiceAdmin = false;
    if (finalSettings.showNutritionalInfoOnInvoice === undefined) finalSettings.showNutritionalInfoOnInvoice = false;
    if (finalSettings.dailyRevenueThreshold === undefined) finalSettings.dailyRevenueThreshold = defaultInvoiceSetupSettings.dailyRevenueThreshold;
    if (finalSettings.employeeBonusAmount === undefined) finalSettings.employeeBonusAmount = defaultInvoiceSetupSettings.employeeBonusAmount;
    if (finalSettings.bonusPercentageAboveThreshold === undefined) finalSettings.bonusPercentageAboveThreshold = defaultInvoiceSetupSettings.bonusPercentageAboveThreshold;


    return saveGeneralSettings(finalSettings);
  } catch (error) {
    return { success: false, message: `Error processing general settings CSV: ${(error as Error).message}` };
  }
}
