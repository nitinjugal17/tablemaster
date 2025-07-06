
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Store, MapPin, ClockIcon, Save, Globe, Info, Image as ImageIcon, Video, Film, Link as LinkIcon, Loader2, Percent, Shield, FileText, QrCode, Quote, PhoneIcon, BadgePercent, Languages, Wand2, Palette, TimerIcon, Mail, BarChart3, CalendarDays, MessageSquare, FileQuestion, ListOrdered, ArrowUp, ArrowDown, ImagePlus, DollarSign as DollarSignIcon, Activity, Trophy, BedDouble, Check, ShoppingCart as ShoppingCartIcon, Columns3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { InvoiceSetupSettings, CurrencyCode, CurrencyOption, AutomatedReportFrequency, InvoiceSectionKey, MenuCategoryEnhancement, AppLanguage, UserRole } from "@/lib/types";
import { currencyOptions, defaultInvoiceSetupSettings, BASE_CURRENCY_CODE, ALL_AUTOMATED_REPORT_FREQUENCIES, DEFAULT_INVOICE_SECTION_ORDER, DEFAULT_HOMEPAGE_LAYOUT, DEFAULT_LIGHT_THEME_COLORS, DEFAULT_DARK_THEME_COLORS, SUPPORTED_LANGUAGES, DEFAULT_USER_ROLES } from "@/lib/types"; 
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGeneralSettings } from "@/context/GeneralSettingsContext";
import { saveGeneralSettings as saveGeneralSettingsAction, getMenuItems } from "@/app/actions/data-management-actions";
import { sendExpenseInventoryReportByEmail } from '@/app/actions/reporting-actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';


const supportedQuoteLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'hi', name: 'Hindi' },
    { code: 'fr', name: 'French' },
    { code: 'bn', name: 'Bengali' },
];

export default function GeneralSettingsPage() {
  const { t } = useTranslation(['general-settings', 'common']);
  const { toast } = useToast();
  const { settings: loadedSettings, isLoadingSettings, refreshGeneralSettings } = useGeneralSettings();
  
  const [formSettings, setFormSettings] = useState<InvoiceSetupSettings>(defaultInvoiceSetupSettings);
  const [currentInvoiceSectionOrder, setCurrentInvoiceSectionOrder] = useState<InvoiceSectionKey[]>(DEFAULT_INVOICE_SECTION_ORDER);
  const [roleLimits, setRoleLimits] = useState<Record<UserRole, number>>({ user: 5, admin: 0, superadmin: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTestReport, setIsSendingTestReport] = useState(false);


  useEffect(() => {
    if (!isLoadingSettings) {
      setFormSettings(loadedSettings); 

      try {
        const parsedOrderFromSettings = loadedSettings.invoiceSectionOrder 
          ? JSON.parse(loadedSettings.invoiceSectionOrder) as InvoiceSectionKey[]
          : [...DEFAULT_INVOICE_SECTION_ORDER];
        
        const validKeysSet = new Set(DEFAULT_INVOICE_SECTION_ORDER); 
        const validatedOrder = parsedOrderFromSettings.filter(key => validKeysSet.has(key));
        const missingKeys = DEFAULT_INVOICE_SECTION_ORDER.filter(key => !validatedOrder.includes(key));
        const finalOrder = [...validatedOrder, ...missingKeys];
        setCurrentInvoiceSectionOrder(finalOrder); 
      } catch (e) {
        console.error("Failed to parse invoiceSectionOrder from settings, using default:", e);
        setCurrentInvoiceSectionOrder([...DEFAULT_INVOICE_SECTION_ORDER]);
      }
      
      try {
        const parsedRoleLimits = loadedSettings.dailyOrderLimitsByRole
            ? JSON.parse(loadedSettings.dailyOrderLimitsByRole)
            : { user: 5, admin: 0 };
        setRoleLimits(prev => ({...prev, ...parsedRoleLimits}));
      } catch (e) {
        console.error("Failed to parse dailyOrderLimitsByRole from settings, using default:", e);
        setRoleLimits({ user: 5, admin: 0, superadmin: 0 });
      }
    }
  }, [loadedSettings, isLoadingSettings]); 


  const handleInputChange = (field: keyof Omit<InvoiceSetupSettings, 'printElements' | 'operatingHours' | 'currencyCode' | 'currencySymbol' | 'gstPercentage' | 'vatPercentage' | 'cessPercentage' | 'autoGenerateInvoiceFooterQuote' | 'invoiceFooterQuoteLanguage' | 'globalDisplayLanguage' | 'autoLogoutTimeoutMinutes' | 'dailyOrderLimitsByRole' | 'enableAutomatedExpenseInventoryReport' | 'automatedReportFrequency' | 'faqContent' | 'invoiceSectionOrder' | 'menuCategoryEnhancements' | 'showCalculatedCostOnInvoiceAdmin' | 'showNutritionalInfoOnInvoice' | 'termsAndConditionsContent' | 'disclaimerContent' | 'userGuideContent' | 'idCardReturnInstructions' | 'footerAboutText' | 'dailyRevenueThreshold' | 'employeeBonusAmount' | 'bonusPercentageAboveThreshold' | 'autoApproveTableBookings' | 'autoApproveRoomBookings' | 'autoApproveNewOrders'>, value: string) => {
    setFormSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleTextAreaChange = (field: 'termsAndConditionsContent' | 'disclaimerContent' | 'userGuideContent' | 'faqContent' | 'footerAboutText' | 'idCardReturnInstructions', value: string) => {
     setFormSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericInputChange = (field: 'gstPercentage' | 'vatPercentage' | 'cessPercentage' | 'autoLogoutTimeoutMinutes' | 'dailyRevenueThreshold' | 'employeeBonusAmount' | 'bonusPercentageAboveThreshold', value: string) => {
    const numValue = parseFloat(value);
    setFormSettings(prev => ({ ...prev, [field]: isNaN(numValue) ? undefined : (field === 'autoLogoutTimeoutMinutes' && numValue < 0 ? 0 : numValue) }));
  };
  
  const handleRoleLimitChange = (role: UserRole, value: string) => {
    const numValue = parseInt(value, 10);
    setRoleLimits(prev => ({
        ...prev,
        [role]: isNaN(numValue) || numValue < 0 ? 0 : numValue,
    }));
  };
  
  const handlePrintElementChange = (field: keyof InvoiceSetupSettings['printElements'], value: boolean) => {
    setFormSettings(prev => ({
        ...prev,
        printElements: {
            ...(prev.printElements),
            [field]: value,
        }
    }));
  };

  const handleOperatingHoursChange = (dayField: keyof NonNullable<InvoiceSetupSettings['operatingHours']>, value: string) => {
    setFormSettings(prev => ({
        ...prev,
        operatingHours: {
            ...(prev.operatingHours || {}),
            [dayField]: value,
        }
    }))
  }
  
  const handleCurrencyChange = (code: CurrencyCode) => {
    const selectedOption = currencyOptions.find(opt => opt.code === code);
    if (selectedOption) {
        setFormSettings(prev => ({
            ...prev,
            currencyCode: selectedOption.code,
            currencySymbol: selectedOption.symbol,
        }));
    }
  };

  const handleBooleanChange = (field: 'autoGenerateInvoiceFooterQuote' | 'enableAutomatedExpenseInventoryReport' | 'showCalculatedCostOnInvoiceAdmin' | 'showNutritionalInfoOnInvoice' | 'autoApproveTableBookings' | 'autoApproveRoomBookings' | 'autoApproveNewOrders', value: boolean) => {
    setFormSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: 'invoiceFooterQuoteLanguage' | 'automatedReportFrequency' | 'globalDisplayLanguage', value: string) => {
    if (field === 'automatedReportFrequency') {
        setFormSettings(prev => ({ ...prev, [field]: value as AutomatedReportFrequency }));
    } else if (field === 'globalDisplayLanguage') {
        setFormSettings(prev => ({ ...prev, [field]: value as AppLanguage }));
        i18n.changeLanguage(value); // Change i18next language
    }
     else {
        setFormSettings(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleMoveSectionUp = (index: number) => {
    if (index === 0) return;
    setCurrentInvoiceSectionOrder(prevOrder => {
      const newOrder = [...prevOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  };

  const handleMoveSectionDown = (index: number) => {
    if (index === currentInvoiceSectionOrder.length - 1) return;
    setCurrentInvoiceSectionOrder(prevOrder => {
      const newOrder = [...prevOrder];
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
      return newOrder;
    });
  };


  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const settingsToSave: InvoiceSetupSettings = {
        ...formSettings,
        gstPercentage: formSettings.gstPercentage === undefined || isNaN(Number(formSettings.gstPercentage)) ? 0 : Number(formSettings.gstPercentage),
        vatPercentage: formSettings.vatPercentage === undefined || isNaN(Number(formSettings.vatPercentage)) ? 0 : Number(formSettings.vatPercentage),
        cessPercentage: formSettings.cessPercentage === undefined || isNaN(Number(formSettings.cessPercentage)) ? 0 : Number(formSettings.cessPercentage),
        autoGenerateInvoiceFooterQuote: formSettings.autoGenerateInvoiceFooterQuote || false,
        invoiceFooterQuoteLanguage: formSettings.invoiceFooterQuoteLanguage || 'en',
        idCardAddressLine: formSettings.idCardAddressLine || "",
        idCardDefaultSignatory: formSettings.idCardDefaultSignatory || "",
        idCardReturnInstructions: formSettings.idCardReturnInstructions || "",
        idCardPropertyOfLine: formSettings.idCardPropertyOfLine || "",
        autoLogoutTimeoutMinutes: formSettings.autoLogoutTimeoutMinutes === undefined || isNaN(Number(formSettings.autoLogoutTimeoutMinutes)) ? 0 : Number(formSettings.autoLogoutTimeoutMinutes),
        dailyOrderLimitsByRole: JSON.stringify(roleLimits),
        globalDisplayLanguage: formSettings.globalDisplayLanguage || 'en',
        homepageLayoutConfig: formSettings.homepageLayoutConfig || JSON.stringify(DEFAULT_HOMEPAGE_LAYOUT),
        invoiceSectionOrder: JSON.stringify(currentInvoiceSectionOrder), 
        enableAutomatedExpenseInventoryReport: formSettings.enableAutomatedExpenseInventoryReport || false,
        automatedReportFrequency: formSettings.automatedReportFrequency || 'weekly',
        automatedReportRecipientEmail: formSettings.automatedReportRecipientEmail || '',
        availableThemes: formSettings.availableThemes || JSON.stringify([{ id: 'default-theme', name: 'Default Theme', lightColors: DEFAULT_LIGHT_THEME_COLORS, darkColors: DEFAULT_DARK_THEME_COLORS }]),
        activeThemeId: formSettings.activeThemeId || 'default-theme',
        footerAboutText: formSettings.footerAboutText || defaultInvoiceSetupSettings.footerAboutText,
        footerContactAddress: formSettings.footerContactAddress || defaultInvoiceSetupSettings.footerContactAddress,
        footerContactEmail: formSettings.footerContactEmail || defaultInvoiceSetupSettings.footerContactEmail,
        footerCopyrightText: formSettings.footerCopyrightText || defaultInvoiceSetupSettings.footerCopyrightText,
        footerFacebookUrl: formSettings.footerFacebookUrl || defaultInvoiceSetupSettings.footerFacebookUrl,
        footerInstagramUrl: formSettings.footerInstagramUrl || defaultInvoiceSetupSettings.footerInstagramUrl,
        footerTwitterUrl: formSettings.footerTwitterUrl || defaultInvoiceSetupSettings.footerTwitterUrl,
        termsAndConditionsContent: formSettings.termsAndConditionsContent || defaultInvoiceSetupSettings.termsAndConditionsContent,
        disclaimerContent: formSettings.disclaimerContent || defaultInvoiceSetupSettings.disclaimerContent,
        userGuideContent: formSettings.userGuideContent || defaultInvoiceSetupSettings.userGuideContent,
        faqContent: formSettings.faqContent || defaultInvoiceSetupSettings.faqContent,
        menuCategoryEnhancements: formSettings.menuCategoryEnhancements || JSON.stringify([]), 
        showCalculatedCostOnInvoiceAdmin: formSettings.showCalculatedCostOnInvoiceAdmin || false,
        showNutritionalInfoOnInvoice: formSettings.showNutritionalInfoOnInvoice || false, 
        dailyRevenueThreshold: formSettings.dailyRevenueThreshold === undefined || isNaN(Number(formSettings.dailyRevenueThreshold)) ? 0 : Number(formSettings.dailyRevenueThreshold),
        employeeBonusAmount: formSettings.employeeBonusAmount === undefined || isNaN(Number(formSettings.employeeBonusAmount)) ? 0 : Number(formSettings.employeeBonusAmount),
        bonusPercentageAboveThreshold: formSettings.bonusPercentageAboveThreshold === undefined || isNaN(Number(formSettings.bonusPercentageAboveThreshold)) ? 0 : Number(formSettings.bonusPercentageAboveThreshold),
        autoApproveTableBookings: formSettings.autoApproveTableBookings || false,
        autoApproveRoomBookings: formSettings.autoApproveRoomBookings || false,
        autoApproveNewOrders: formSettings.autoApproveNewOrders || false,
      };

      const result = await saveGeneralSettingsAction(settingsToSave);
      if (result.success) {
        toast({
          title: t('common:success'),
          description: t('general-settings:saveSuccessMessage', "Your restaurant's general information and settings have been saved to the server."),
        });
        await refreshGeneralSettings(); 
      } else {
        toast({ title: t('common:error'), description: result.message, variant: "destructive" });
      }
    } catch (e) {
      console.error("Error saving general settings:", e);
      toast({ title: t('common:error'), description: t('general-settings:saveErrorMessage', "Could not save general settings."), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSendTestReport = async () => {
    setIsSendingTestReport(true);
    if (!formSettings.automatedReportRecipientEmail) {
      toast({ title: "Missing Recipient", description: "Please set an email address for automated reports first.", variant: "destructive"});
      setIsSendingTestReport(false);
      return;
    }
    try {
      const result = await sendExpenseInventoryReportByEmail({
        recipientEmail: formSettings.automatedReportRecipientEmail,
        dateRange: { 
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), 
          to: new Date().toISOString() 
        }, 
        reportTriggerContext: "Manual Test from General Settings"
      });
      if (result.success) {
        toast({ title: "Test Report Sent", description: `Report sent to ${formSettings.automatedReportRecipientEmail}. ${result.messageId === 'mock_message_id' ? '(Mocked for console)' : ''}` });
      } else {
        toast({ title: "Failed to Send Report", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error Sending Report", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSendingTestReport(false);
    }
  };

  const getSectionDisplayName = (sectionKey: InvoiceSectionKey): string => {
    switch (sectionKey) {
        case 'qrCodeOrder': return 'QR Code - Order';
        case 'qrCodePay': return 'QR Code - Pay';
        default: return sectionKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="space-y-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">{t('pageTitle')}</h1>
          <p className="text-muted-foreground">{t('pageDescription')}</p>
        </div>
        <Card><CardContent className="p-6 text-center flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('common:loading')}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <Button variant="outline" asChild className="mb-4">
            <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">{t('pageTitle')}</h1>
        <p className="text-muted-foreground">{t('pageDescription')}</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Store className="mr-2 h-5 w-5 text-accent"/>{t('restaurantInfoTitle')}</CardTitle>
          <CardDescription>{t('restaurantInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="companyName">{t('restaurantNameLabel')}</Label>
                <Input id="companyName" value={formSettings.companyName || ""} onChange={(e) => handleInputChange('companyName', e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">{t('restaurantNameDescription')}</p>
            </div>
            <div>
                <Label htmlFor="companyAddress">{t('addressLabel')}</Label>
                <Input id="companyAddress" value={formSettings.companyAddress || ""} onChange={(e) => handleInputChange('companyAddress', e.target.value)} />
            </div>
            <div>
                <Label htmlFor="companyPhone">{t('phoneLabel')}</Label>
                <Input id="companyPhone" type="tel" value={formSettings.companyPhone || ""} onChange={(e) => handleInputChange('companyPhone', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="panNumber">{t('panLabel')}</Label>
                    <Input id="panNumber" value={formSettings.panNumber || ""} onChange={(e) => handleInputChange('panNumber', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="gstNumber">{t('gstLabel')}</Label>
                    <Input id="gstNumber" value={formSettings.gstNumber || ""} onChange={(e) => handleInputChange('gstNumber', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="fssaiNumber">{t('fssaiLabel')}</Label>
                    <Input id="fssaiNumber" value={formSettings.fssaiNumber || ""} onChange={(e) => handleInputChange('fssaiNumber', e.target.value)} />
                </div>
            </div>
        </CardContent>
      </Card>

       <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><Check className="mr-2 h-5 w-5 text-accent"/>Auto-Approval Settings</CardTitle>
            <CardDescription>Configure auto-approval workflows for orders and bookings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label htmlFor="autoApproveNewOrders" className="flex flex-col">
                    <span className="flex items-center"><ShoppingCartIcon className="mr-2 h-4 w-4"/>Auto-approve New Orders</span>
                    <span className="text-xs text-muted-foreground">If enabled, new takeaway/POS orders will be set to 'Preparing'.</span>
                </Label>
                <Switch
                    id="autoApproveNewOrders"
                    checked={formSettings.autoApproveNewOrders}
                    onCheckedChange={(val) => handleBooleanChange('autoApproveNewOrders', val)}
                />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label htmlFor="autoApproveTableBookings" className="flex flex-col">
                    <span className="flex items-center"><Columns3 className="mr-2 h-4 w-4"/>Auto-approve Table Bookings</span>
                    <span className="text-xs text-muted-foreground">If enabled, new table bookings will be automatically confirmed.</span>
                </Label>
                <Switch
                    id="autoApproveTableBookings"
                    checked={formSettings.autoApproveTableBookings}
                    onCheckedChange={(val) => handleBooleanChange('autoApproveTableBookings', val)}
                />
            </div>
             <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label htmlFor="autoApproveRoomBookings" className="flex flex-col">
                    <span className="flex items-center"><BedDouble className="mr-2 h-4 w-4"/>Auto-approve Room Bookings</span>
                    <span className="text-xs text-muted-foreground">If enabled, new room bookings will be automatically confirmed.</span>
                </Label>
                <Switch
                    id="autoApproveRoomBookings"
                    checked={formSettings.autoApproveRoomBookings}
                    onCheckedChange={(val) => handleBooleanChange('autoApproveRoomBookings', val)}
                />
            </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><Trophy className="mr-2 h-5 w-5 text-accent"/>Employee Daily Incentive Program</CardTitle>
            <CardDescription>Configure a bonus program based on daily revenue targets.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="dailyRevenueThreshold">Daily Revenue Threshold ({BASE_CURRENCY_CODE})</Label>
              <Input 
                id="dailyRevenueThreshold" 
                type="number" 
                min="0" 
                value={formSettings.dailyRevenueThreshold ?? ""} 
                onChange={(e) => handleNumericInputChange('dailyRevenueThreshold', e.target.value)} 
                placeholder="e.g., 50000"
              />
              <p className="text-xs text-muted-foreground mt-1">If today's revenue meets this target, the bonus is activated.</p>
            </div>
            <div>
              <Label htmlFor="bonusPercentageAboveThreshold">Bonus Percentage Above Threshold (%)</Label>
              <Input 
                id="bonusPercentageAboveThreshold" 
                type="number" 
                min="0"
                max="100"
                value={formSettings.bonusPercentageAboveThreshold ?? ""} 
                onChange={(e) => handleNumericInputChange('bonusPercentageAboveThreshold', e.target.value)} 
                placeholder="e.g., 10 for 10%"
              />
              <p className="text-xs text-muted-foreground mt-1">Percentage of revenue *above* the threshold to be put into the bonus pool.</p>
            </div>
            <div>
              <Label htmlFor="employeeBonusAmount">Maximum Daily Bonus Pool ({BASE_CURRENCY_CODE})</Label>
              <Input 
                id="employeeBonusAmount" 
                type="number" 
                min="0" 
                value={formSettings.employeeBonusAmount ?? ""} 
                onChange={(e) => handleNumericInputChange('employeeBonusAmount', e.target.value)} 
                placeholder="e.g., 2500"
              />
              <p className="text-xs text-muted-foreground mt-1">The calculated bonus pool will not exceed this total amount. Set to 0 for no cap.</p>
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><Shield className="mr-2 h-5 w-5 text-accent"/>User & Order Policies</CardTitle>
            <CardDescription>Set global policies for user interactions and orders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="autoLogoutTimeoutMinutes" className="flex items-center"><TimerIcon className="mr-2 h-4 w-4"/>{t('autoLogoutLabel')}</Label>
                <Input 
                    id="autoLogoutTimeoutMinutes" 
                    type="number" 
                    min="0" 
                    value={formSettings.autoLogoutTimeoutMinutes ?? ""} 
                    onChange={(e) => handleNumericInputChange('autoLogoutTimeoutMinutes', e.target.value)} 
                    placeholder="e.g., 30"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('autoLogoutDescription')}</p>
            </div>
            <div>
                <Label className="flex items-center mb-2"><Activity className="mr-2 h-4 w-4"/>Daily Order Limits by Role</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(DEFAULT_USER_ROLES.filter(r => r !== 'superadmin') as UserRole[]).map(role => (
                    <div key={role}>
                    <Label htmlFor={`roleLimit-${role}`} className="capitalize text-sm font-normal">{role} Role Limit</Label>
                    <Input
                        id={`roleLimit-${role}`}
                        type="number"
                        min="0"
                        value={roleLimits[role] ?? 0}
                        onChange={(e) => handleRoleLimitChange(role, e.target.value)}
                        placeholder="e.g., 5"
                    />
                    </div>
                ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Maximum orders a user of a specific role can place per day. Set to 0 for unlimited. Superadmins are always unlimited.</p>
            </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><Globe className="mr-2 h-5 w-5 text-accent"/>{t('displayLangSettingsTitle')}</CardTitle>
            <CardDescription>{t('displayLangSettingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="currencySelect">{t('displayCurrencyLabel')}</Label>
                <Select value={formSettings.currencyCode} onValueChange={(value) => handleCurrencyChange(value as CurrencyCode)}>
                    <SelectTrigger id="currencySelect">
                        <SelectValue placeholder={t('displayCurrencyPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        {currencyOptions.map(option => (
                            <SelectItem key={option.code} value={option.code}>
                                {option.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {formSettings.currencySymbol && <p className="text-sm text-muted-foreground mt-2">{t('currentDisplaySymbolText')} <span className="font-bold text-lg">{formSettings.currencySymbol}</span></p>}
                <Alert variant="default" className="mt-2 bg-primary/10 border-primary/30 text-primary/90 text-sm">
                    <Info className="h-4 w-4 text-primary" />
                    {t('baseCurrencyInfoText', { baseCurrency: BASE_CURRENCY_CODE })}
                </Alert>
            </div>
             <div>
                <Label htmlFor="globalDisplayLanguage">{t('globalDisplayLanguageLabel')}</Label>
                <Select 
                    value={formSettings.globalDisplayLanguage || 'en'} 
                    onValueChange={(value) => handleSelectChange('globalDisplayLanguage', value)}
                >
                    <SelectTrigger id="globalDisplayLanguage">
                        <SelectValue placeholder={t('globalDisplayLanguagePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                        {SUPPORTED_LANGUAGES.map(lang => (
                            <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Alert variant="default" className="mt-2 bg-sky-50 border-sky-300 text-sky-700 text-sm">
                    <Languages className="h-4 w-4 text-sky-600" />
                    {t('globalDisplayLanguageInfoText')}
                </Alert>
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><BadgePercent className="mr-2 h-5 w-5 text-accent"/>Tax Configuration</CardTitle>
          <CardDescription>Set default tax percentages for invoices. Enter values like '5' for 5%.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="gstPercentage">GST Percentage (%)</Label>
              <Input id="gstPercentage" type="number" step="0.01" placeholder="e.g., 5" value={formSettings.gstPercentage ?? ""} onChange={(e) => handleNumericInputChange('gstPercentage', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="vatPercentage">VAT Percentage (%)</Label>
              <Input id="vatPercentage" type="number" step="0.01" placeholder="e.g., 0" value={formSettings.vatPercentage ?? ""} onChange={(e) => handleNumericInputChange('vatPercentage', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cessPercentage">Cess Percentage (%)</Label>
              <Input id="cessPercentage" type="number" step="0.01" placeholder="e.g., 0" value={formSettings.cessPercentage ?? ""} onChange={(e) => handleNumericInputChange('cessPercentage', e.target.value)} />
            </div>
          </div>
           <Alert variant="default">
                <Info className="h-5 w-5" />
                <AlertTitle className="font-semibold">Tax Calculation</AlertTitle>
                <p className="text-sm">
                    - GST and VAT are calculated on the order subtotal.
                    - Cess is calculated on (Subtotal + GST Amount + VAT Amount).
                    Set a tax to 0 if not applicable.
                </p>
            </Alert>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-accent"/>Homepage Section Media URLs</CardTitle>
            <CardDescription>Set URLs for media (images, GIFs, videos) used in different sections of the public homepage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="websiteHeaderLogoUrl">Website Header Logo URL</Label>
                <Input id="websiteHeaderLogoUrl" value={formSettings.websiteHeaderLogoUrl || ""} onChange={(e) => handleInputChange('websiteHeaderLogoUrl', e.target.value)} placeholder="https://example.com/website-logo.png" />
                <p className="text-xs text-muted-foreground mt-1">URL for the logo in the main website header. Supports GIF, PNG, JPG, AVIF, BMP, WebP.</p>
            </div>
             <div>
                <Label htmlFor="heroBackgroundMediaUrl">Hero Section Background Media URL</Label>
                <Input id="heroBackgroundMediaUrl" value={formSettings.heroBackgroundMediaUrl || ""} onChange={(e) => handleInputChange('heroBackgroundMediaUrl', e.target.value)} placeholder="https://example.com/hero-bg.mp4" />
                <p className="text-xs text-muted-foreground mt-1">Background for the main hero/banner section.</p>
            </div>
             <div>
                <Label htmlFor="welcomeMediaUrl">Welcome Section Media URL</Label>
                <Input id="welcomeMediaUrl" value={formSettings.welcomeMediaUrl || ""} onChange={(e) => handleInputChange('welcomeMediaUrl', e.target.value)} placeholder="https://example.com/welcome.gif" />
                <p className="text-xs text-muted-foreground mt-1">Media for a welcome or "About Us" section.</p>
            </div>
             <div>
                <Label htmlFor="orderTakeawayMediaUrl">"Order Takeaway" Section Media URL</Label>
                <Input id="orderTakeawayMediaUrl" value={formSettings.orderTakeawayMediaUrl || ""} onChange={(e) => handleInputChange('orderTakeawayMediaUrl', e.target.value)} placeholder="https://example.com/takeaway-visual.png" />
                <p className="text-xs text-muted-foreground mt-1">Visual for the takeaway feature section.</p>
            </div>
             <div>
                <Label htmlFor="bookATableMediaUrl">"Book a Table" Section Media URL</Label>
                <Input id="bookATableMediaUrl" value={formSettings.bookATableMediaUrl || ""} onChange={(e) => handleInputChange('bookATableMediaUrl', e.target.value)} placeholder="https://example.com/booking-visual.jpg" />
                <p className="text-xs text-muted-foreground mt-1">Visual for the table booking feature section.</p>
            </div>
            <div>
              <Label htmlFor="roomBookingMediaUrl">"Book a Room" Section Media URL</Label>
              <Input id="roomBookingMediaUrl" value={formSettings.roomBookingMediaUrl || ""} onChange={(e) => handleInputChange('roomBookingMediaUrl', e.target.value)} placeholder="https://example.com/room-booking-visual.jpg" />
              <p className="text-xs text-muted-foreground mt-1">Visual for the room booking feature section.</p>
            </div>
             <div>
                <Label htmlFor="signatureDishBackgroundMediaUrl">"Signature Dishes" Section Background Media URL</Label>
                <Input id="signatureDishBackgroundMediaUrl" value={formSettings.signatureDishBackgroundMediaUrl || ""} onChange={(e) => handleInputChange('signatureDishBackgroundMediaUrl', e.target.value)} placeholder="https://example.com/menu-highlights-bg.avif" />
                <p className="text-xs text-muted-foreground mt-1">Background for the menu highlights/signature dishes area.</p>
            </div>
            <Alert variant="default">
                <Film className="h-5 w-5" />
                <AlertTitle className="font-semibold">Media Formats</AlertTitle>
                <p className="text-sm">
                    For image URLs, common formats like AVIF, PNG, JPG, GIF are generally supported by browsers. For video URLs, use formats like MP4 (H.264/H.265) or WebM. Ensure URLs are publicly accessible.
                </p>
            </Alert>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-accent"/>Invoice Media URLs</CardTitle>
            <CardDescription>Set URLs for logos and QR codes on invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="companyLogoUrl">Invoice Logo URL</Label>
                    <Input id="companyLogoUrl" value={formSettings.companyLogoUrl || ""} onChange={(e) => handleInputChange('companyLogoUrl', e.target.value)} placeholder="https://example.com/invoice-logo.png" />
                    <p className="text-xs text-muted-foreground mt-1">Direct URL to logo image for invoices.</p>
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="scanForOrderQRUrl">'Scan for Order' QR Image URL</Label>
                    <Input id="scanForOrderQRUrl" value={formSettings.scanForOrderQRUrl || ""} onChange={(e) => handleInputChange('scanForOrderQRUrl', e.target.value)} placeholder="URL to QR code image for ordering"/>
                    <p className="text-xs text-muted-foreground mt-1">Provide a direct URL to an image (AVIF, PNG, BMP).</p>
                </div>
                <div>
                    <Label htmlFor="scanForPayQRUrl">'Scan for Pay' QR Image URL</Label>
                    <Input id="scanForPayQRUrl" value={formSettings.scanForPayQRUrl || ""} onChange={(e) => handleInputChange('scanForPayQRUrl', e.target.value)} placeholder="URL to QR code image for payment"/>
                     <p className="text-xs text-muted-foreground mt-1">Provide a direct URL to an image (AVIF, PNG, BMP).</p>
                </div>
            </div>
        </CardContent>
      </Card>


      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><FileText className="mr-2 h-5 w-5 text-accent"/>Invoice Content & Elements</CardTitle>
          <CardDescription>Customize text and visible elements on printed invoices/receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="invoiceHeaderText">Invoice Header Text (e.g., Blessing)</Label>
                <Input id="invoiceHeaderText" value={formSettings.invoiceHeaderText || ""} onChange={(e) => handleInputChange('invoiceHeaderText', e.target.value)} placeholder="e.g., Jai Shree Ram 🙏" />
            </div>
            
            <div className="space-y-2 border p-4 rounded-md bg-muted/20">
                 <div className="flex items-center justify-between">
                    <Label htmlFor="autoGenerateFooterQuoteSwitch" className="flex flex-col">
                    <span>Auto-generate Footer Quote 1 (AI)</span>
                    <span className="text-xs text-muted-foreground">Overrides manual text below if enabled.</span>
                    </Label>
                    <Switch
                        id="autoGenerateFooterQuoteSwitch"
                        checked={formSettings.autoGenerateInvoiceFooterQuote}
                        onCheckedChange={(val) => handleBooleanChange('autoGenerateInvoiceFooterQuote', val)}
                    />
                </div>
                {formSettings.autoGenerateInvoiceFooterQuote && (
                    <div>
                        <Label htmlFor="invoiceFooterQuoteLanguage">Quote Language</Label>
                        <Select
                        value={formSettings.invoiceFooterQuoteLanguage}
                        onValueChange={(value) => handleSelectChange('invoiceFooterQuoteLanguage', value)}
                        >
                        <SelectTrigger id="invoiceFooterQuoteLanguage">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            {supportedQuoteLanguages.map(lang => (
                            <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">The AI will generate a quote in this language.</p>
                    </div>
                )}
                 <div>
                    <Label htmlFor="invoiceFooterText1">Manual Footer Text 1 (Fallback / If AI is off)</Label>
                    <Textarea id="invoiceFooterText1" value={formSettings.invoiceFooterText1 || ""} onChange={(e) => handleInputChange('invoiceFooterText1', e.target.value)} placeholder="e.g., A quote or special message..." rows={2} disabled={formSettings.autoGenerateInvoiceFooterQuote}/>
                </div>
            </div>


            <div>
                <Label htmlFor="invoiceFooterText2">Footer Text 2 (e.g., Terms & Conditions)</Label>
                <Textarea id="invoiceFooterText2" value={formSettings.invoiceFooterText2 || ""} onChange={(e) => handleInputChange('invoiceFooterText2', e.target.value)} placeholder="e.g., All disputes subject to local jurisdiction..." rows={3}/>
            </div>
            <h4 className="font-medium pt-2">Invoice Print Elements:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {[
                {id: 'showCompanyAddress', label: 'Company Address', icon: <MapPin className="mr-2 h-4 w-4"/>},
                {id: 'showCompanyPhone', label: 'Company Phone', icon: <PhoneIcon className="mr-2 h-4 w-4"/>},
                {id: 'showLogo', label: 'Invoice Logo', icon: <ImageIcon className="mr-2 h-4 w-4"/>},
                {id: 'showInvoiceHeaderText', label: 'Header Text', icon: <Quote className="mr-2 h-4 w-4" style={{ transform: 'scaleX(-1)' }} />},
                {id: 'showScanForOrderQR', label: "'Scan for Order' QR", icon: <QrCode className="mr-2 h-4 w-4"/>},
                {id: 'showScanForPayQR', label: "'Scan for Pay' QR", icon: <QrCode className="mr-2 h-4 w-4"/>},
                {id: 'showPanNumber', label: 'PAN Number', icon: <Percent className="mr-2 h-4 w-4"/>},
                {id: 'showGstNumber', label: 'GST Number', icon: <Percent className="mr-2 h-4 w-4"/>},
                {id: 'showFssaiNumber', label: 'FSSAI Number', icon: <Shield className="mr-2 h-4 w-4"/>},
                {id: 'showInvoiceFooterText1', label: 'Footer Text 1', icon: <Quote className="mr-2 h-4 w-4"/>},
                {id: 'showInvoiceFooterText2', label: 'Footer Text 2 (T&C)', icon: <Info className="mr-2 h-4 w-4"/>},
            ].map(opt => (
                <div key={opt.id} className="flex items-center space-x-2">
                    <Switch
                        id={`printElements-${opt.id}`}
                        checked={formSettings.printElements[opt.id as keyof InvoiceSetupSettings['printElements']]}
                        onCheckedChange={(val) => handlePrintElementChange(opt.id as keyof InvoiceSetupSettings['printElements'], val)}
                    />
                    <Label htmlFor={`printElements-${opt.id}`} className="flex items-center text-sm">{opt.icon}{opt.label}</Label>
                </div>
            ))}
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="showCalculatedCostOnInvoiceAdminSwitch"
                checked={formSettings.showCalculatedCostOnInvoiceAdmin}
                onCheckedChange={(val) => handleBooleanChange('showCalculatedCostOnInvoiceAdmin', val)}
              />
              <Label htmlFor="showCalculatedCostOnInvoiceAdminSwitch" className="flex items-center text-sm">
                <DollarSignIcon className="mr-2 h-4 w-4 text-blue-500"/>Show Calculated Cost on Admin Invoices/Receipts
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-8">If enabled, the current calculated cost of items will be shown on invoices/receipts viewed or printed from admin interfaces.</p>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="showNutritionalInfoOnInvoiceSwitch"
                checked={formSettings.showNutritionalInfoOnInvoice}
                onCheckedChange={(val) => handleBooleanChange('showNutritionalInfoOnInvoice', val)}
              />
              <Label htmlFor="showNutritionalInfoOnInvoiceSwitch" className="flex items-center text-sm">
                <Activity className="mr-2 h-4 w-4 text-green-600"/>Show Nutritional Info on Admin Invoices/Receipts
              </Label>
            </div>
             <p className="text-xs text-muted-foreground pl-8">If enabled, generated nutritional information (calories, carbs, etc.) for menu items will be shown on invoices/receipts viewed or printed from admin interfaces.</p>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><ListOrdered className="mr-2 h-5 w-5 text-accent"/> Invoice Section Order</CardTitle>
          <CardDescription>Organize the order in which sections appear on your invoices. Changes apply to both PDF/Web and Thermal previews/prints.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentInvoiceSectionOrder.map((sectionKey, index) => (
            <div key={sectionKey} className="flex items-center justify-between p-2 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
              <span className="font-medium capitalize">
                {getSectionDisplayName(sectionKey)}
              </span>
              <div className="space-x-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveSectionUp(index)}
                  disabled={index === 0 || isSaving}
                  title="Move Up"
                  className="h-7 w-7"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveSectionDown(index)}
                  disabled={index === currentInvoiceSectionOrder.length - 1 || isSaving}
                  title="Move Down"
                  className="h-7 w-7"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><ClockIcon className="mr-2 h-5 w-5 text-accent"/>Operating Hours</CardTitle>
          <CardDescription>Set your restaurant's daily opening and closing times. Used to display "Open/Closed" status on the public site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Label>Monday - Friday</Label>
                <Input type="time" value={formSettings.operatingHours?.monFriOpen || ""} onChange={e => handleOperatingHoursChange('monFriOpen', e.target.value)} />
                <Input type="time" value={formSettings.operatingHours?.monFriClose || ""} onChange={e => handleOperatingHoursChange('monFriClose', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Label>Saturday</Label>
                <Input type="time" value={formSettings.operatingHours?.satOpen || ""} onChange={e => handleOperatingHoursChange('satOpen', e.target.value)} />
                <Input type="time" value={formSettings.operatingHours?.satClose || ""} onChange={e => handleOperatingHoursChange('satClose', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <Label>Sunday</Label>
                <Input type="time" value={formSettings.operatingHours?.sunOpen || ""} onChange={e => handleOperatingHoursChange('sunOpen', e.target.value)} />
                <Input type="time" value={formSettings.operatingHours?.sunClose || ""} onChange={e => handleOperatingHoursChange('sunClose', e.target.value)} />
            </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Palette className="mr-2 h-5 w-5 text-accent"/>ID Card Settings</CardTitle>
          <CardDescription>Set default text and information for employee ID cards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="idCardAddressLine">ID Card Address Line (Optional)</Label>
                <Input id="idCardAddressLine" value={formSettings.idCardAddressLine || ""} onChange={(e) => handleInputChange('idCardAddressLine', e.target.value)} placeholder="e.g., 123 Main St, Anytown (Short Address)"/>
                <p className="text-xs text-muted-foreground mt-1">A concise address line to display on ID cards.</p>
            </div>
             <div>
                <Label htmlFor="idCardDefaultSignatory">Default Authorized Signatory (Optional)</Label>
                <Input id="idCardDefaultSignatory" value={formSettings.idCardDefaultSignatory || ""} onChange={(e) => handleInputChange('idCardDefaultSignatory', e.target.value)} placeholder="e.g., General Manager"/>
                <p className="text-xs text-muted-foreground mt-1">Default signatory name for ID cards. Can be overridden per card.</p>
            </div>
             <div>
                <Label htmlFor="idCardReturnInstructions">ID Card Return Instructions (Optional)</Label>
                <Textarea id="idCardReturnInstructions" value={formSettings.idCardReturnInstructions || ""} onChange={(e) => handleTextAreaChange('idCardReturnInstructions', e.target.value)} placeholder="e.g., If found, please return to HR department or call (555) 123-4567." rows={2}/>
                <p className="text-xs text-muted-foreground mt-1">Instructions for if an ID card is found.</p>
            </div>
            <div>
                <Label htmlFor="idCardPropertyOfLine">ID Card 'Property Of' Line (Optional)</Label>
                <Input id="idCardPropertyOfLine" value={formSettings.idCardPropertyOfLine || ""} onChange={(e) => handleInputChange('idCardPropertyOfLine', e.target.value)} placeholder="e.g., This card is the property of [Your Company Name]."/>
                <p className="text-xs text-muted-foreground mt-1">Statement about card ownership.</p>
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-accent"/>Automated Reporting</CardTitle>
          <CardDescription>Configure automated email reports for expenses and inventory.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <Label htmlFor="enableAutomatedReport" className="text-base">Enable Expense & Inventory Reports</Label>
                    <p className="text-xs text-muted-foreground">
                        When enabled, reports will be sent based on the frequency below.
                    </p>
                </div>
                <Switch
                    id="enableAutomatedReport"
                    checked={formSettings.enableAutomatedExpenseInventoryReport}
                    onCheckedChange={(val) => handleBooleanChange('enableAutomatedExpenseInventoryReport', val)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="automatedReportFrequency">Report Frequency</Label>
                    <Select
                        value={formSettings.automatedReportFrequency}
                        onValueChange={(value) => handleSelectChange('automatedReportFrequency', value)}
                        disabled={!formSettings.enableAutomatedExpenseInventoryReport}
                    >
                        <SelectTrigger id="automatedReportFrequency">
                        <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                        {ALL_AUTOMATED_REPORT_FREQUENCIES.map(freq => (
                            <SelectItem key={freq} value={freq} className="capitalize">{freq}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="automatedReportRecipientEmail">Recipient Email Address</Label>
                    <Input
                        id="automatedReportRecipientEmail"
                        type="email"
                        placeholder="admin@example.com"
                        value={formSettings.automatedReportRecipientEmail || ""}
                        onChange={(e) => handleInputChange('automatedReportRecipientEmail', e.target.value)}
                        disabled={!formSettings.enableAutomatedExpenseInventoryReport}
                    />
                    <p className="text-xs text-muted-foreground">Email to send the reports to.</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleSendTestReport}
                    disabled={isSendingTestReport || !formSettings.enableAutomatedExpenseInventoryReport || !formSettings.automatedReportRecipientEmail}
                >
                    {isSendingTestReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                    Send Test Report Now
                </Button>
                 <Alert variant="default" className="mt-4 sm:mt-0 flex-1 bg-blue-50 border-blue-300 text-blue-700">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="font-semibold">Scheduling Note</AlertTitle>
                    <p className="text-sm">
                        Actual automated scheduling (e.g., daily, weekly) requires server-side setup like a cron job or a scheduled cloud function. This button only tests the report generation and email sending.
                    </p>
                </Alert>
            </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-accent" />Footer & Legal Page Content</CardTitle>
            <CardDescription>Manage content for the website footer and legal/informational pages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="footerAboutText">Footer "About Us" Text</Label>
                <Textarea id="footerAboutText" value={formSettings.footerAboutText || ""} onChange={(e) => handleTextAreaChange('footerAboutText', e.target.value)} rows={3} placeholder="Short blurb about your restaurant for the footer." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="footerContactAddress">Footer Contact Address</Label>
                    <Input id="footerContactAddress" value={formSettings.footerContactAddress || ""} onChange={(e) => handleInputChange('footerContactAddress', e.target.value)} placeholder="e.g., 123 Main St, City" />
                </div>
                <div>
                    <Label htmlFor="footerContactEmail">Footer Contact Email</Label>
                    <Input id="footerContactEmail" type="email" value={formSettings.footerContactEmail || ""} onChange={(e) => handleInputChange('footerContactEmail', e.target.value)} placeholder="e.g., contact@restaurant.com" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <Label htmlFor="footerFacebookUrl">Facebook URL</Label>
                    <Input id="footerFacebookUrl" value={formSettings.footerFacebookUrl || ""} onChange={(e) => handleInputChange('footerFacebookUrl', e.target.value)} placeholder="https://facebook.com/yourpage" />
                </div>
                <div>
                    <Label htmlFor="footerInstagramUrl">Instagram URL</Label>
                    <Input id="footerInstagramUrl" value={formSettings.footerInstagramUrl || ""} onChange={(e) => handleInputChange('footerInstagramUrl', e.target.value)} placeholder="https://instagram.com/yourpage" />
                </div>
                <div>
                    <Label htmlFor="footerTwitterUrl">Twitter/X URL</Label>
                    <Input id="footerTwitterUrl" value={formSettings.footerTwitterUrl || ""} onChange={(e) => handleInputChange('footerTwitterUrl', e.target.value)} placeholder="https://twitter.com/yourpage" />
                </div>
            </div>
             <div>
                <Label htmlFor="footerCopyrightText">Footer Copyright Text</Label>
                <Input id="footerCopyrightText" value={formSettings.footerCopyrightText || ""} onChange={(e) => handleInputChange('footerCopyrightText', e.target.value)} placeholder="e.g., © {year} {companyName}. All rights reserved." />
                <p className="text-xs text-muted-foreground mt-1">Use {'{year}'} and {'{companyName}'} as placeholders.</p>
            </div>
            <hr className="my-3" />
            <div>
                <Label htmlFor="termsAndConditionsContent" className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Terms & Conditions Page Content</Label>
                <Textarea id="termsAndConditionsContent" value={formSettings.termsAndConditionsContent || ""} onChange={(e) => handleTextAreaChange('termsAndConditionsContent', e.target.value)} rows={8} placeholder="Enter full HTML or Markdown content for your Terms and Conditions page."/>
            </div>
            <div>
                <Label htmlFor="disclaimerContent" className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Disclaimer Page Content</Label>
                <Textarea id="disclaimerContent" value={formSettings.disclaimerContent || ""} onChange={(e) => handleTextAreaChange('disclaimerContent', e.target.value)} rows={6} placeholder="Enter full HTML or Markdown content for your Disclaimer page."/>
            </div>
             <div>
                <Label htmlFor="userGuideContent" className="flex items-center"><FileText className="mr-2 h-4 w-4"/>User Guide Page Content</Label>
                <Textarea id="userGuideContent" value={formSettings.userGuideContent || ""} onChange={(e) => handleTextAreaChange('userGuideContent', e.target.value)} rows={8} placeholder="Enter full HTML or Markdown content for your User Guide page."/>
            </div>
            <div>
                <Label htmlFor="faqContent" className="flex items-center"><FileQuestion className="mr-2 h-4 w-4"/>FAQ Page Content (JSON)</Label>
                <Textarea id="faqContent" value={formSettings.faqContent || ""} onChange={(e) => handleTextAreaChange('faqContent', e.target.value)} rows={8} placeholder='[{"q": "Question 1?", "a": "Answer 1."}, {"q": "Question 2?", "a": "Answer 2."}]'/>
                <p className="text-xs text-muted-foreground mt-1">Enter as a JSON array of objects, each with "q" (question) and "a" (answer) keys.</p>
            </div>
        </CardContent>
      </Card>


       <div className="flex justify-end mt-6">
            <Button onClick={handleSaveSettings} disabled={isSaving || isLoadingSettings}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('saveButtonText')}
            </Button>
       </div>
    </div>
  );
}
