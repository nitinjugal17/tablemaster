
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Store, MapPin, ClockIcon, Save, Globe, Info, Image as ImageIcon, Video, Film, Link as LinkIcon, Loader2, Percent, Shield, FileText, QrCode, Quote, PhoneIcon, BadgePercent, Languages, Wand2, Palette, TimerIcon, Mail, BarChart3, CalendarDays, MessageSquare, FileQuestion, ListOrdered, ArrowUp, ArrowDown, ImagePlus, DollarSign as DollarSignIcon, Activity, Trophy, BedDouble, Check, ShoppingCart as ShoppingCartIcon, Columns3, ShieldQuestion, Building2, Bell, ShieldCheck, Printer, ChefHat, Archive, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { InvoiceSetupSettings, CurrencyCode, CurrencyOption, AutomatedReportFrequency, InvoiceSectionKey, MenuCategoryEnhancement, AppLanguage, UserRole, EstablishmentType, HotelTariffBracket, SoundNotificationSettings, PrinterSetting } from "@/lib/types";
import { currencyOptions, defaultInvoiceSetupSettings, BASE_CURRENCY_CODE, ALL_AUTOMATED_REPORT_FREQUENCIES, DEFAULT_INVOICE_SECTION_ORDER, DEFAULT_HOMEPAGE_LAYOUT, DEFAULT_LIGHT_THEME_COLORS, DEFAULT_DARK_THEME_COLORS, SUPPORTED_LANGUAGES, DEFAULT_USER_ROLES } from "@/lib/types"; 
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGeneralSettings } from "@/context/GeneralSettingsContext";
import { saveGeneralSettings as saveGeneralSettingsAction, getMenuItems, getPrinterSettings } from "@/app/actions/data-management-actions";
import { sendExpenseInventoryReportByEmail } from "@/app/actions/reporting-actions";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/context/AuthContext';
import { Label } from "@/components/ui/label";


const supportedQuoteLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'hi', name: 'Hindi' },
    { code: 'fr', name: 'French' },
    { code: 'bn', name: 'Bengali' },
];

export default function GeneralSettingsPage() {
  const { t, i18n: i18nInstance } = useTranslation(['general-settings', 'common']);
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings: loadedSettings, isLoadingSettings, refreshGeneralSettings } = useGeneralSettings();
  
  const [formSettings, setFormSettings] = useState<InvoiceSetupSettings>(defaultInvoiceSetupSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTestReport, setIsSendingTestReport] = useState(false);
  const [printers, setPrinters] = useState<PrinterSetting[]>([]);

  useEffect(() => {
    if (!isLoadingSettings) {
      setFormSettings(loadedSettings); 
    }
    async function fetchPrinters() {
        try {
            setPrinters(await getPrinterSettings());
        } catch(e) {
            toast({title: "Error fetching printers", variant: "destructive"});
        }
    }
    fetchPrinters();
  }, [loadedSettings, isLoadingSettings, toast]);

  const handleValueChange = (field: keyof InvoiceSetupSettings, value: any) => {
    setFormSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericInputChange = (field: keyof InvoiceSetupSettings, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleValueChange(field, value === '' ? undefined : parseFloat(value));
  };
  
  const handleRoleLimitChange = (role: UserRole, e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseInt(e.target.value, 10);
    const currentLimits = formSettings.dailyOrderLimitsByRole ? JSON.parse(formSettings.dailyOrderLimitsByRole) : { user: 5, admin: 0 };
    const newLimits = { ...currentLimits, [role]: isNaN(numValue) || numValue < 0 ? 0 : numValue };
    handleValueChange('dailyOrderLimitsByRole', JSON.stringify(newLimits));
  };
  
  const handlePrintElementChange = (field: keyof InvoiceSetupSettings['printElements'], value: boolean) => {
    handleValueChange('printElements', { ...formSettings.printElements, [field]: value });
  };
  
  const handleOperatingHoursChange = (dayField: keyof NonNullable<InvoiceSetupSettings['operatingHours']>, e: React.ChangeEvent<HTMLInputElement>) => {
    handleValueChange('operatingHours', { ...(formSettings.operatingHours || {}), [dayField]: e.target.value });
  }

  const handleSoundNotificationChange = (field: keyof SoundNotificationSettings, value: boolean) => {
    handleValueChange('soundNotifications', {
        ...(formSettings.soundNotifications || { playOnNewOrder: true, playOnNewBooking: true, playOnChefUpdate: false }),
        [field]: value,
    });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const currentOrder = formSettings.invoiceSectionOrder ? JSON.parse(formSettings.invoiceSectionOrder) : [...DEFAULT_INVOICE_SECTION_ORDER];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;
    [currentOrder[index], currentOrder[targetIndex]] = [currentOrder[targetIndex], currentOrder[index]];
    handleValueChange('invoiceSectionOrder', JSON.stringify(currentOrder));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const result = await saveGeneralSettingsAction(formSettings);
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
        toast({ title: "Test Report Sent", description: `Report sent to ${formSettings.automatedReportRecipientEmail}. ${result.messageId === 'mock_message_id' ? '(Mocked for Console)' : ''}` });
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

  const masterDateRange: DateRange | undefined = useMemo(() => {
    const from = formSettings.masterDateRangeFrom ? parseISO(formSettings.masterDateRangeFrom) : undefined;
    const to = formSettings.masterDateRangeTo ? parseISO(formSettings.masterDateRangeTo) : undefined;
    return { from, to };
  }, [formSettings.masterDateRangeFrom, formSettings.masterDateRangeTo]);
  
  const handleMasterDateChange = (range: DateRange | undefined) => {
    setFormSettings(prev => ({
        ...prev,
        masterDateRangeFrom: range?.from?.toISOString(),
        masterDateRangeTo: range?.to?.toISOString(),
    }));
  };

  const parsedInvoiceSectionOrder = useMemo(() => {
    try {
        const parsed = formSettings.invoiceSectionOrder ? JSON.parse(formSettings.invoiceSectionOrder) : [...DEFAULT_INVOICE_SECTION_ORDER];
        const validKeys = new Set(DEFAULT_INVOICE_SECTION_ORDER);
        const validated = parsed.filter((key: InvoiceSectionKey) => validKeys.has(key));
        const missingKeys = DEFAULT_INVOICE_SECTION_ORDER.filter(key => !validated.includes(key));
        return [...validated, ...missingKeys];
    } catch {
        return [...DEFAULT_INVOICE_SECTION_ORDER];
    }
  }, [formSettings.invoiceSectionOrder]);

  const parsedRoleLimits = useMemo(() => {
    try {
        return formSettings.dailyOrderLimitsByRole ? JSON.parse(formSettings.dailyOrderLimitsByRole) : { user: 5, admin: 0 };
    } catch {
        return { user: 5, admin: 0 };
    }
  }, [formSettings.dailyOrderLimitsByRole]);

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

       {user?.role === 'superadmin' && (
        <Card className="shadow-xl border-accent">
            <CardHeader>
                <CardTitle className="font-headline flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-accent"/>Master Data Filter</CardTitle>
                <CardDescription>As a Superadmin, you can set a global date range to filter historical data across all relevant pages (e.g., reports, orders, bookings).</CardDescription>
            </CardHeader>
            <CardContent>
                <DateRangePicker date={masterDateRange} onDateChange={handleMasterDateChange} />
                <Button variant="ghost" size="sm" onClick={() => handleMasterDateChange(undefined)} className="mt-2 text-xs">Clear Master Filter</Button>
                <p className="text-xs text-muted-foreground mt-2">Leave blank to view all data. This setting is saved with other general settings.</p>
            </CardContent>
        </Card>
      )}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Store className="mr-2 h-5 w-5 text-accent"/>{t('restaurantInfoTitle')}</CardTitle>
          <CardDescription>{t('restaurantInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="companyName">{t('restaurantNameLabel')}</Label>
                <Input id="companyName" value={formSettings.companyName || ""} onChange={e => handleValueChange('companyName', e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">{t('restaurantNameDescription')}</p>
            </div>
            <div>
                <Label htmlFor="companyAddress">{t('addressLabel')}</Label>
                <Input id="companyAddress" value={formSettings.companyAddress || ""} onChange={e => handleValueChange('companyAddress', e.target.value)} />
            </div>
            <div>
                <Label htmlFor="companyPhone">{t('phoneLabel')}</Label>
                <Input id="companyPhone" type="tel" value={formSettings.companyPhone || ""} onChange={e => handleValueChange('companyPhone', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="panNumber">{t('panLabel')}</Label>
                    <Input id="panNumber" value={formSettings.panNumber || ""} onChange={e => handleValueChange('panNumber', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="gstNumber">{t('gstLabel')}</Label>
                    <Input id="gstNumber" value={formSettings.gstNumber || ""} onChange={e => handleValueChange('gstNumber', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="fssaiNumber">{t('fssaiLabel')}</Label>
                    <Input id="fssaiNumber" value={formSettings.fssaiNumber || ""} onChange={e => handleValueChange('fssaiNumber', e.target.value)} />
                </div>
            </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><Bell className="mr-2 h-5 w-5 text-accent"/>Sound Notifications</CardTitle>
            <CardDescription>Configure audible alerts for important events in the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label htmlFor="playOnNewOrder" className="flex flex-col">
                    <span>Play Sound on New Order</span>
                    <span className="text-xs text-muted-foreground">Alerts when any new order is received.</span>
                </Label>
                <Switch
                    id="playOnNewOrder"
                    checked={formSettings.soundNotifications?.playOnNewOrder ?? true}
                    onCheckedChange={(val) => handleSoundNotificationChange('playOnNewOrder', val)}
                />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label htmlFor="playOnNewBooking" className="flex flex-col">
                    <span>Play Sound on New Booking</span>
                    <span className="text-xs text-muted-foreground">Alerts when a new booking request is made.</span>
                </Label>
                <Switch
                    id="playOnNewBooking"
                    checked={formSettings.soundNotifications?.playOnNewBooking ?? true}
                    onCheckedChange={(val) => handleSoundNotificationChange('playOnNewBooking', val)}
                />
            </div>
             <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <Label htmlFor="playOnChefUpdate" className="flex flex-col">
                    <span>Play Sound on Chef Update</span>
                    <span className="text-xs text-muted-foreground">Alerts when an order status is updated by the chef. (Conceptual)</span>
                </Label>
                <Switch
                    id="playOnChefUpdate"
                    checked={formSettings.soundNotifications?.playOnChefUpdate ?? false}
                    onCheckedChange={(val) => handleSoundNotificationChange('playOnChefUpdate', val)}
                />
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><BadgePercent className="mr-2 h-5 w-5 text-accent"/>Tax &amp; GST Configuration</CardTitle>
            <CardDescription>Set GST rates based on your establishment type. Incorrect settings will lead to incorrect tax calculation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
              <Label>Establishment Type</Label>
              <RadioGroup value={formSettings.establishmentType} onValueChange={(val) => handleValueChange('establishmentType', val as EstablishmentType)} className="flex gap-4 mt-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="standalone" id="standalone"/><Label htmlFor="standalone">Standalone Restaurant</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="hotel" id="hotel"/><Label htmlFor="hotel">Restaurant within a Hotel</Label></div>
              </RadioGroup>
            </div>

            {formSettings.establishmentType === 'hotel' && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <Label>Hotel Room Tariff (Preceding Financial Year)</Label>
                <RadioGroup value={formSettings.hotelTariffBracket} onValueChange={(val) => handleValueChange('hotelTariffBracket', val as HotelTariffBracket)} className="mt-2 space-y-1">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="below_7500" id="below_7500"/><Label htmlFor="below_7500">Room tariff was ≤ ₹7,500 (5% GST, no ITC)</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="above_7500" id="above_7500"/><Label htmlFor="above_7500">Room tariff was &gt; ₹7,500 (18% GST, with ITC)</Label></div>
                </RadioGroup>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5"><Label htmlFor="compositionSwitch">Composition Scheme</Label><p className="text-xs text-muted-foreground">Enable if your restaurant is under the GST Composition Scheme.</p></div>
                <Switch id="compositionSwitch" checked={formSettings.isCompositionScheme} onCheckedChange={(val) => handleValueChange('isCompositionScheme', val)}/>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div>
                  <Label htmlFor="serviceChargePercentage">Service Charge (%) (Optional)</Label>
                  <Input id="serviceChargePercentage" type="number" step="0.5" placeholder="e.g., 10" value={formSettings.serviceChargePercentage ?? ""} onChange={(e) => handleNumericInputChange('serviceChargePercentage', e)} />
                  <p className="text-xs text-muted-foreground mt-1">Note: Service Charge is optional for the customer to pay.</p>
                </div>
                <div>
                    <Label htmlFor="gstPercentage">Legacy GST Override (%)</Label>
                    <Input id="gstPercentage" type="number" step="0.01" placeholder="e.g., 5" value={formSettings.gstPercentage ?? ""} onChange={(e) => handleNumericInputChange('gstPercentage', e)} />
                    <p className="text-xs text-muted-foreground mt-1">This is overridden by the new settings above. Kept for fallback.</p>
                </div>
             </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-accent"/>Security &amp; Privacy</CardTitle>
            <CardDescription>Manage security-related settings for the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="customerInfoPin">Customer Info Access PIN</Label>
                <Input 
                    id="customerInfoPin" 
                    type="password"
                    maxLength={4}
                    value={formSettings.customerInfoPin ?? ""}
                    onChange={(e) => handleValueChange('customerInfoPin', e.target.value)}
                    placeholder="Enter a 4-digit PIN"
                />
                <p className="text-xs text-muted-foreground mt-1">A 4-digit PIN for staff to access sensitive customer information like phone numbers on order cards.</p>
            </div>
             {user?.role === 'superadmin' && (
              <div>
                  <Label htmlFor="completedOrderPin">Completed Order Override PIN</Label>
                  <Input 
                      id="completedOrderPin" 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formSettings.completedOrderPin ?? ""}
                      onChange={(e) => handleValueChange('completedOrderPin', e.target.value)}
                      placeholder="Enter a PIN"
                  />
                  <p className="text-xs text-muted-foreground mt-1">PIN required to change the status of 'Completed' or 'Cancelled' orders. (Superadmin only)</p>
              </div>
            )}
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
                    onCheckedChange={(val) => handleValueChange('autoApproveNewOrders', val)}
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
                    onCheckedChange={(val) => handleValueChange('autoApproveTableBookings', val)}
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
                    onCheckedChange={(val) => handleValueChange('autoApproveRoomBookings', val)}
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
              <Input id="dailyRevenueThreshold" type="number" min="0" value={formSettings.dailyRevenueThreshold ?? ""} onChange={(e) => handleNumericInputChange('dailyRevenueThreshold', e)} placeholder="e.g., 50000"/>
              <p className="text-xs text-muted-foreground mt-1">If today's revenue meets this target, the bonus is activated.</p>
            </div>
            <div>
              <Label htmlFor="bonusPercentageAboveThreshold">Bonus Percentage Above Threshold (%)</Label>
              <Input id="bonusPercentageAboveThreshold" type="number" min="0" max="100" value={formSettings.bonusPercentageAboveThreshold ?? ""} onChange={(e) => handleNumericInputChange('bonusPercentageAboveThreshold', e)} placeholder="e.g., 10 for 10%"/>
              <p className="text-xs text-muted-foreground mt-1">Percentage of revenue *above* the threshold to be put into the bonus pool.</p>
            </div>
            <div>
              <Label htmlFor="employeeBonusAmount">Maximum Daily Bonus Pool ({BASE_CURRENCY_CODE})</Label>
              <Input id="employeeBonusAmount" type="number" min="0" value={formSettings.employeeBonusAmount ?? ""} onChange={(e) => handleNumericInputChange('employeeBonusAmount', e)} placeholder="e.g., 2500"/>
              <p className="text-xs text-muted-foreground mt-1">The calculated bonus pool will not exceed this total amount. Set to 0 for no cap.</p>
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><Shield className="mr-2 h-5 w-5 text-accent"/>User &amp; Order Policies</CardTitle>
            <CardDescription>Set global policies for user interactions and orders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="autoLogoutTimeoutMinutes" className="flex items-center"><TimerIcon className="mr-2 h-4 w-4"/>{t('autoLogoutLabel')}</Label>
                <Input id="autoLogoutTimeoutMinutes" type="number" min="0" value={formSettings.autoLogoutTimeoutMinutes ?? ""} onChange={(e) => handleNumericInputChange('autoLogoutTimeoutMinutes', e)} placeholder="e.g., 30"/>
                <p className="text-xs text-muted-foreground mt-1">{t('autoLogoutDescription')}</p>
            </div>
            <div>
                <Label className="flex items-center mb-2"><Activity className="mr-2 h-4 w-4"/>Daily Order Limits by Role</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(DEFAULT_USER_ROLES.filter(r => r !== 'superadmin') as UserRole[]).map(role => (
                    <div key={role}>
                    <Label htmlFor={`roleLimit-${role}`} className="capitalize text-sm font-normal">{role} Role Limit</Label>
                    <Input id={`roleLimit-${role}`} type="number" min="0" value={parsedRoleLimits[role] ?? 0} onChange={(e) => handleRoleLimitChange(role, e)} placeholder="e.g., 5"/>
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
                <Select value={formSettings.currencyCode} onValueChange={(value) => handleValueChange('currencyCode', value as CurrencyCode)}>
                    <SelectTrigger id="currencySelect"><SelectValue placeholder={t('displayCurrencyPlaceholder')} /></SelectTrigger>
                    <SelectContent>{currencyOptions.map(option => (<SelectItem key={option.code} value={option.code}>{option.name}</SelectItem>))}</SelectContent>
                </Select>
                {formSettings.currencySymbol && <p className="text-sm text-muted-foreground mt-2">{t('currentDisplaySymbolText')} <span className="font-bold text-lg">{formSettings.currencySymbol}</span></p>}
                <Alert variant="default" className="mt-2 bg-primary/10 border-primary/30 text-primary/90 text-sm"><Info className="h-4 w-4 text-primary" />{t('baseCurrencyInfoText', { baseCurrency: BASE_CURRENCY_CODE })}</Alert>
            </div>
             <div>
                <Label htmlFor="globalDisplayLanguage">{t('globalDisplayLanguageLabel')}</Label>
                <Select value={formSettings.globalDisplayLanguage || 'en'} onValueChange={(value) => { handleValueChange('globalDisplayLanguage', value as AppLanguage); i18nInstance.changeLanguage(value); }}>
                    <SelectTrigger id="globalDisplayLanguage"><SelectValue placeholder={t('globalDisplayLanguagePlaceholder')} /></SelectTrigger>
                    <SelectContent>{SUPPORTED_LANGUAGES.map(lang => (<SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>))}</SelectContent>
                </Select>
                 <Alert variant="default" className="mt-2 bg-sky-50 border-sky-300 text-sky-700 text-sm"><Languages className="h-4 w-4 text-sky-600" />{t('globalDisplayLanguageInfoText')}</Alert>
            </div>
        </CardContent>
      </Card>
    
      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-accent"/>Homepage Section Media URLs</CardTitle><CardDescription>Set URLs for media (images, GIFs, videos) used in different sections of the public homepage.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <div><Label htmlFor="websiteHeaderLogoUrl">Website Header Logo URL</Label><Input id="websiteHeaderLogoUrl" value={formSettings.websiteHeaderLogoUrl || ""} onChange={e => handleValueChange('websiteHeaderLogoUrl', e.target.value)} placeholder="https://example.com/website-logo.png" /><p className="text-xs text-muted-foreground mt-1">URL for the logo in the main website header. Supports GIF, PNG, JPG, AVIF, BMP, WebP.</p></div>
            <div><Label htmlFor="heroBackgroundMediaUrl">Hero Section Background Media URL</Label><Input id="heroBackgroundMediaUrl" value={formSettings.heroBackgroundMediaUrl || ""} onChange={e => handleValueChange('heroBackgroundMediaUrl', e.target.value)} placeholder="https://example.com/hero-bg.mp4" /><p className="text-xs text-muted-foreground mt-1">Background for the main hero/banner section.</p></div>
            <div><Label htmlFor="welcomeMediaUrl">Welcome Section Media URL</Label><Input id="welcomeMediaUrl" value={formSettings.welcomeMediaUrl || ""} onChange={e => handleValueChange('welcomeMediaUrl', e.target.value)} placeholder="https://example.com/welcome.gif" /><p className="text-xs text-muted-foreground mt-1">Media for a welcome or "About Us" section.</p></div>
            <div><Label htmlFor="orderTakeawayMediaUrl">"Order Takeaway" Section Media URL</Label><Input id="orderTakeawayMediaUrl" value={formSettings.orderTakeawayMediaUrl || ""} onChange={e => handleValueChange('orderTakeawayMediaUrl', e.target.value)} placeholder="https://example.com/takeaway-visual.png" /><p className="text-xs text-muted-foreground mt-1">Visual for the takeaway feature section.</p></div>
            <div><Label htmlFor="bookATableMediaUrl">"Book a Table" Section Media URL</Label><Input id="bookATableMediaUrl" value={formSettings.bookATableMediaUrl || ""} onChange={e => handleValueChange('bookATableMediaUrl', e.target.value)} placeholder="https://example.com/booking-visual.jpg" /><p className="text-xs text-muted-foreground mt-1">Visual for the table booking feature section.</p></div>
            <div><Label htmlFor="roomBookingMediaUrl">"Book a Room" Section Media URL</Label><Input id="roomBookingMediaUrl" value={formSettings.roomBookingMediaUrl || ""} onChange={e => handleValueChange('roomBookingMediaUrl', e.target.value)} placeholder="https://example.com/room-booking-visual.jpg" /><p className="text-xs text-muted-foreground mt-1">Visual for the room booking feature section.</p></div>
            <div><Label htmlFor="signatureDishBackgroundMediaUrl">"Signature Dishes" Section Background Media URL</Label><Input id="signatureDishBackgroundMediaUrl" value={formSettings.signatureDishBackgroundMediaUrl || ""} onChange={e => handleValueChange('signatureDishBackgroundMediaUrl', e.target.value)} placeholder="https://example.com/menu-highlights-bg.avif" /><p className="text-xs text-muted-foreground mt-1">Background for the menu highlights/signature dishes area.</p></div>
            <Alert variant="default"><Film className="h-5 w-5" /><AlertTitle className="font-semibold">Media Formats</AlertTitle><p className="text-sm">For image URLs, common formats like AVIF, PNG, JPG, GIF are generally supported by browsers. For video URLs, use formats like MP4 (H.264/H.265) or WebM. Ensure URLs are publicly accessible.</p></Alert>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-accent"/>Invoice Media URLs</CardTitle><CardDescription>Set URLs for logos and QR codes on invoices.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><Label htmlFor="companyLogoUrl">Invoice Logo URL</Label><Input id="companyLogoUrl" value={formSettings.companyLogoUrl || ""} onChange={e => handleValueChange('companyLogoUrl', e.target.value)} placeholder="https://example.com/invoice-logo.png" /><p className="text-xs text-muted-foreground mt-1">Direct URL to logo image for invoices.</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label htmlFor="scanForOrderQRUrl">'Scan for Order' QR Image URL</Label><Input id="scanForOrderQRUrl" value={formSettings.scanForOrderQRUrl || ""} onChange={e => handleValueChange('scanForOrderQRUrl', e.target.value)} placeholder="URL to QR code image for ordering"/><p className="text-xs text-muted-foreground mt-1">Provide a direct URL to an image (AVIF, PNG, BMP).</p></div>
                <div><Label htmlFor="scanForPayQRUrl">'Scan for Pay' QR Image URL</Label><Input id="scanForPayQRUrl" value={formSettings.scanForPayQRUrl || ""} onChange={e => handleValueChange('scanForPayQRUrl', e.target.value)} placeholder="URL to QR code image for payment"/><p className="text-xs text-muted-foreground mt-1">Provide a direct URL to an image (AVIF, PNG, BMP).</p></div>
            </div>
        </CardContent>
      </Card>


      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><FileText className="mr-2 h-5 w-5 text-accent"/>Invoice Content &amp; Elements</CardTitle><CardDescription>Customize text and visible elements on printed invoices/receipts.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <div><Label htmlFor="invoiceHeaderText">Invoice Header Text (e.g., Blessing)</Label><Input id="invoiceHeaderText" value={formSettings.invoiceHeaderText || ""} onChange={e => handleValueChange('invoiceHeaderText', e.target.value)} placeholder="e.g., Jai Shree Ram 🙏" /></div>
            <div className="space-y-2 border p-4 rounded-md bg-muted/20">
                <div className="flex items-center justify-between"><Label htmlFor="autoGenerateFooterQuoteSwitch" className="flex flex-col"><span>Auto-generate Footer Quote 1 (AI)</span><span className="text-xs text-muted-foreground">Overrides manual text below if enabled.</span></Label><Switch id="autoGenerateFooterQuoteSwitch" checked={formSettings.autoGenerateInvoiceFooterQuote} onCheckedChange={(val) => handleValueChange('autoGenerateInvoiceFooterQuote', val)} /></div>
                {formSettings.autoGenerateInvoiceFooterQuote && (<div><Label htmlFor="invoiceFooterQuoteLanguage">Quote Language</Label><Select value={formSettings.invoiceFooterQuoteLanguage} onValueChange={(value) => handleValueChange('invoiceFooterQuoteLanguage', value)}><SelectTrigger id="invoiceFooterQuoteLanguage"><SelectValue placeholder="Select language" /></SelectTrigger><SelectContent>{supportedQuoteLanguages.map(lang => (<SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>))}</SelectContent></Select><p className="text-xs text-muted-foreground mt-1">The AI will generate a quote in this language.</p></div>)}
                <div><Label htmlFor="invoiceFooterText1">Manual Footer Text 1 (Fallback / If AI is off)</Label><Textarea id="invoiceFooterText1" value={formSettings.invoiceFooterText1 || ""} onChange={e => handleValueChange('invoiceFooterText1', e.target.value)} placeholder="e.g., A quote or special message..." rows={2} disabled={formSettings.autoGenerateInvoiceFooterQuote}/></div>
            </div>
            <div><Label htmlFor="invoiceFooterText2">Footer Text 2 (e.g., Terms &amp; Conditions)</Label><Textarea id="invoiceFooterText2" value={formSettings.invoiceFooterText2 || ""} onChange={e => handleValueChange('invoiceFooterText2', e.target.value)} placeholder="e.g., All disputes subject to local jurisdiction..." rows={3}/></div>
            <h4 className="font-medium pt-2">Invoice Print Elements:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">{Object.keys(formSettings.printElements).map(key => (<div key={key} className="flex items-center space-x-2"><Switch id={`printElements-${key}`} checked={formSettings.printElements[key as keyof typeof formSettings.printElements]} onCheckedChange={(val) => handlePrintElementChange(key as keyof typeof formSettings.printElements, val)}/><Label htmlFor={`printElements-${key}`} className="text-sm">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Label></div>))}</div>
            <div className="flex items-center space-x-2 pt-2"><Switch id="showCalculatedCostOnInvoiceAdminSwitch" checked={formSettings.showCalculatedCostOnInvoiceAdmin} onCheckedChange={(val) => handleValueChange('showCalculatedCostOnInvoiceAdmin', val)}/><Label htmlFor="showCalculatedCostOnInvoiceAdminSwitch" className="flex items-center text-sm"><DollarSignIcon className="mr-2 h-4 w-4 text-blue-500"/>Show Calculated Cost on Admin Invoices/Receipts</Label></div>
            <p className="text-xs text-muted-foreground pl-8">If enabled, the current calculated cost of items will be shown on invoices/receipts viewed or printed from admin interfaces.</p>
            <div className="flex items-center space-x-2 pt-2"><Switch id="showNutritionalInfoOnInvoiceSwitch" checked={formSettings.showNutritionalInfoOnInvoice} onCheckedChange={(val) => handleValueChange('showNutritionalInfoOnInvoice', val)}/><Label htmlFor="showNutritionalInfoOnInvoiceSwitch" className="flex items-center text-sm"><Activity className="mr-2 h-4 w-4 text-green-600"/>Show Nutritional Info on Admin Invoices/Receipts</Label></div>
            <p className="text-xs text-muted-foreground pl-8">If enabled, generated nutritional information (calories, carbs, etc.) for menu items will be shown on invoices/receipts viewed or printed from admin interfaces.</p>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><ListOrdered className="mr-2 h-5 w-5 text-accent"/> Invoice Section Order</CardTitle><CardDescription>Organize the order in which sections appear on your invoices. Changes apply to both PDF/Web and Thermal previews/prints.</CardDescription></CardHeader>
        <CardContent className="space-y-3">{parsedInvoiceSectionOrder.map((sectionKey, index) => (<div key={sectionKey} className="flex items-center justify-between p-2 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"><span className="font-medium capitalize">{getSectionDisplayName(sectionKey)}</span><div className="space-x-1"><Button type="button" variant="ghost" size="icon" onClick={() => handleMoveSection(index, 'up')} disabled={index === 0 || isSaving} title="Move Up" className="h-7 w-7"><ArrowUp className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => handleMoveSection(index, 'down')} disabled={index === parsedInvoiceSectionOrder.length - 1 || isSaving} title="Move Down" className="h-7 w-7"><ArrowDown className="h-4 w-4" /></Button></div></div>))}</CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><ClockIcon className="mr-2 h-5 w-5 text-accent"/>Operating Hours</CardTitle><CardDescription>Set your restaurant's daily opening and closing times. Used to display "Open/Closed" status on the public site.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center"><Label>Monday - Friday</Label><Input type="time" value={formSettings.operatingHours?.monFriOpen || ""} onChange={e => handleOperatingHoursChange('monFriOpen', e)} /><Input type="time" value={formSettings.operatingHours?.monFriClose || ""} onChange={e => handleOperatingHoursChange('monFriClose', e)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center"><Label>Saturday</Label><Input type="time" value={formSettings.operatingHours?.satOpen || ""} onChange={e => handleOperatingHoursChange('satOpen', e)} /><Input type="time" value={formSettings.operatingHours?.satClose || ""} onChange={e => handleOperatingHoursChange('satClose', e)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center"><Label>Sunday</Label><Input type="time" value={formSettings.operatingHours?.sunOpen || ""} onChange={e => handleOperatingHoursChange('sunOpen', e)} /><Input type="time" value={formSettings.operatingHours?.sunClose || ""} onChange={e => handleOperatingHoursChange('sunClose', e)} /></div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><Palette className="mr-2 h-5 w-5 text-accent"/>ID Card Settings</CardTitle><CardDescription>Set default text and information for employee ID cards.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <div><Label htmlFor="idCardAddressLine">ID Card Address Line (Optional)</Label><Input id="idCardAddressLine" value={formSettings.idCardAddressLine || ""} onChange={e => handleValueChange('idCardAddressLine', e.target.value)} placeholder="e.g., 123 Main St, Anytown (Short Address)"/><p className="text-xs text-muted-foreground mt-1">A concise address line to display on ID cards.</p></div>
            <div><Label htmlFor="idCardDefaultSignatory">Default Authorized Signatory (Optional)</Label><Input id="idCardDefaultSignatory" value={formSettings.idCardDefaultSignatory || ""} onChange={e => handleValueChange('idCardDefaultSignatory', e.target.value)} placeholder="e.g., General Manager"/><p className="text-xs text-muted-foreground mt-1">Default signatory name for ID cards. Can be overridden per card.</p></div>
            <div><Label htmlFor="idCardReturnInstructions">ID Card Return Instructions (Optional)</Label><Textarea id="idCardReturnInstructions" value={formSettings.idCardReturnInstructions || ""} onChange={e => handleValueChange('idCardReturnInstructions', e.target.value)} placeholder="e.g., If found, please return to HR department or call (555) 123-4567." rows={2}/><p className="text-xs text-muted-foreground mt-1">Instructions for if an ID card is found.</p></div>
            <div><Label htmlFor="idCardPropertyOfLine">ID Card 'Property Of' Line (Optional)</Label><Input id="idCardPropertyOfLine" value={formSettings.idCardPropertyOfLine || ""} onChange={e => handleValueChange('idCardPropertyOfLine', e.target.value)} placeholder="e.g., This card is the property of [Your Company Name]."/><p className="text-xs text-muted-foreground mt-1">Statement about card ownership.</p></div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-accent"/>Automated Reporting</CardTitle><CardDescription>Configure automated email reports for expenses and inventory.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><Label htmlFor="enableAutomatedReport" className="text-base">Enable Expense &amp; Inventory Reports</Label><p className="text-xs text-muted-foreground">When enabled, reports will be sent based on the frequency below.</p></div><Switch id="enableAutomatedReport" checked={formSettings.enableAutomatedExpenseInventoryReport} onCheckedChange={(val) => handleValueChange('enableAutomatedExpenseInventoryReport', val)}/></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label htmlFor="automatedReportFrequency">Report Frequency</Label><Select value={formSettings.automatedReportFrequency} onValueChange={(value) => handleValueChange('automatedReportFrequency', value as AutomatedReportFrequency)} disabled={!formSettings.enableAutomatedExpenseInventoryReport}><SelectTrigger id="automatedReportFrequency"><SelectValue placeholder="Select frequency" /></SelectTrigger><SelectContent>{ALL_AUTOMATED_REPORT_FREQUENCIES.map(freq => (<SelectItem key={freq} value={freq} className="capitalize">{freq}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="automatedReportRecipientEmail">Recipient Email Address</Label><Input id="automatedReportRecipientEmail" type="email" placeholder="admin@example.com" value={formSettings.automatedReportRecipientEmail || ""} onChange={e => handleValueChange('automatedReportRecipientEmail', e.target.value)} disabled={!formSettings.enableAutomatedExpenseInventoryReport}/><p className="text-xs text-muted-foreground">Email to send the reports to.</p></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-start"><Button type="button" variant="outline" onClick={handleSendTestReport} disabled={isSendingTestReport || !formSettings.enableAutomatedExpenseInventoryReport || !formSettings.automatedReportRecipientEmail}>{isSendingTestReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Send Test Report Now</Button><Alert variant="default" className="mt-4 sm:mt-0 flex-1 bg-blue-50 border-blue-300 text-blue-700"><CalendarDays className="h-5 w-5 text-blue-600" /><AlertTitle className="font-semibold">Scheduling Note</AlertTitle><p className="text-sm">Actual automated scheduling (e.g., daily, weekly) requires server-side setup like a cron job or a scheduled cloud function. This button only tests the report generation and email sending.</p></Alert></div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-accent" />Footer &amp; Legal Page Content</CardTitle><CardDescription>Manage content for the website footer and legal/informational pages.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <div><Label htmlFor="footerAboutText">Footer "About Us" Text</Label><Textarea id="footerAboutText" value={formSettings.footerAboutText || ""} onChange={e => handleValueChange('footerAboutText', e.target.value)} rows={3} placeholder="Short blurb about your restaurant for the footer." /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><Label htmlFor="footerContactAddress">Footer Contact Address</Label><Input id="footerContactAddress" value={formSettings.footerContactAddress || ""} onChange={e => handleValueChange('footerContactAddress', e.target.value)} placeholder="e.g., 123 Main St, City" /></div><div><Label htmlFor="footerContactEmail">Footer Contact Email</Label><Input id="footerContactEmail" type="email" value={formSettings.footerContactEmail || ""} onChange={e => handleValueChange('footerContactEmail', e.target.value)} placeholder="e.g., contact@restaurant.com" /></div></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div><Label htmlFor="footerFacebookUrl">Facebook URL</Label><Input id="footerFacebookUrl" value={formSettings.footerFacebookUrl || ""} onChange={e => handleValueChange('footerFacebookUrl', e.target.value)} placeholder="https://facebook.com/yourpage" /></div><div><Label htmlFor="footerInstagramUrl">Instagram URL</Label><Input id="footerInstagramUrl" value={formSettings.footerInstagramUrl || ""} onChange={e => handleValueChange('footerInstagramUrl', e.target.value)} placeholder="https://instagram.com/yourpage" /></div><div><Label htmlFor="footerTwitterUrl">Twitter/X URL</Label><Input id="footerTwitterUrl" value={formSettings.footerTwitterUrl || ""} onChange={e => handleValueChange('footerTwitterUrl', e.target.value)} placeholder="https://twitter.com/yourpage" /></div></div>
            <div><Label htmlFor="footerCopyrightText">Footer Copyright Text</Label><Input id="footerCopyrightText" value={formSettings.footerCopyrightText || ""} onChange={e => handleValueChange('footerCopyrightText', e.target.value)} placeholder="e.g., © {year} {companyName}. All rights reserved." /><p className="text-xs text-muted-foreground mt-1">Use {'{year}'} and {'{companyName}'} as placeholders.</p></div>
            <hr className="my-3" />
            <div><Label htmlFor="termsAndConditionsContent" className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Terms &amp; Conditions Page Content</Label><Textarea id="termsAndConditionsContent" value={formSettings.termsAndConditionsContent || ""} onChange={e => handleValueChange('termsAndConditionsContent', e.target.value)} rows={8} placeholder="Enter full HTML or Markdown content for your Terms and Conditions page."/></div>
            <div><Label htmlFor="disclaimerContent" className="flex items-center"><FileText className="mr-2 h-4 w-4"/>Disclaimer Page Content</Label><Textarea id="disclaimerContent" value={formSettings.disclaimerContent || ""} onChange={e => handleValueChange('disclaimerContent', e.target.value)} rows={6} placeholder="Enter full HTML or Markdown content for your Disclaimer page."/></div>
            <div><Label htmlFor="userGuideContent" className="flex items-center"><FileText className="mr-2 h-4 w-4"/>User Guide Page Content</Label><Textarea id="userGuideContent" value={formSettings.userGuideContent || ""} onChange={e => handleValueChange('userGuideContent', e.target.value)} rows={8} placeholder="Enter full HTML or Markdown content for your User Guide page."/></div>
            <div><Label htmlFor="faqContent" className="flex items-center"><FileQuestion className="mr-2 h-4 w-4"/>FAQ Page Content (JSON)</Label><Textarea id="faqContent" value={formSettings.faqContent || ""} onChange={e => handleValueChange('faqContent', e.target.value)} rows={8} placeholder='[{\"q\": \"Question 1?\", \"a\": \"Answer 1.\"}]'/><p className="text-xs text-muted-foreground mt-1">Enter as a JSON array of objects, each with "q" (question) and "a" (answer) keys.</p></div>
        </CardContent>
      </Card>
      {user?.role === 'superadmin' && (<>
      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><Printer className="mr-2 h-5 w-5 text-accent"/>KOT Printer Config</CardTitle><CardDescription>Assign specific printers for Kitchen Order Tickets (KOTs) and Stock-related printouts. Superadmin only.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2"><Label htmlFor="chefKotPrinter" className="flex items-center gap-2"><ChefHat className="h-4 w-4"/>Chef KOT Printer</Label><Select value={formSettings.defaultChefKotPrinterId || '__NONE__'} onValueChange={(val) => handleValueChange('defaultChefKotPrinterId', val)} disabled={printers.length === 0}><SelectTrigger id="chefKotPrinter"><SelectValue placeholder="Use Main Thermal Printer" /></SelectTrigger><SelectContent><SelectItem value="__NONE__">Use Main Thermal Printer</SelectItem>{printers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
             <div className="space-y-2"><Label htmlFor="chefKotLang">Chef KOT Language</Label><Select value={formSettings.chefKotLanguage || 'en'} onValueChange={(val) => handleValueChange('chefKotLanguage', val as AppLanguage)}><SelectTrigger id="chefKotLang"><SelectValue/></SelectTrigger><SelectContent>{SUPPORTED_LANGUAGES.map(lang => <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>)}</SelectContent></Select></div>
             <div className="space-y-2"><Label htmlFor="stockKotPrinter" className="flex items-center gap-2"><Archive className="h-4 w-4"/>Stock KOT Printer</Label><Select value={formSettings.defaultStockKotPrinterId || '__NONE__'} onValueChange={(val) => handleValueChange('defaultStockKotPrinterId', val)} disabled={printers.length === 0}><SelectTrigger id="stockKotPrinter"><SelectValue placeholder="Use Main Thermal Printer" /></SelectTrigger><SelectContent><SelectItem value="__NONE__">Use Main Thermal Printer</SelectItem>{printers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
             <div className="space-y-2"><Label htmlFor="stockKotLang">Stock KOT Language</Label><Select value={formSettings.stockKotLanguage || 'en'} onValueChange={(val) => handleValueChange('stockKotLanguage', val as AppLanguage)}><SelectTrigger id="stockKotLang"><SelectValue/></SelectTrigger><SelectContent>{SUPPORTED_LANGUAGES.map(lang => <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>)}</SelectContent></Select></div>
        </CardContent>
      </Card>
      
      <Card className="shadow-xl">
        <CardHeader><CardTitle className="font-headline flex items-center"><Settings className="mr-2 h-5 w-5 text-accent"/>Automated KOT Printing</CardTitle><CardDescription>Configure rules for automatically printing KOTs when orders are approved.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 border rounded-md"><Label htmlFor="enableAutoKot" className="flex flex-col space-y-1"><span>Enable Auto KOT Printing</span><span className="font-normal text-xs text-muted-foreground">Automatically print a KOT when an order status becomes 'Preparing'.</span></Label><Switch id="enableAutoKot" checked={formSettings.enableAutoKotPrinting} onCheckedChange={(val) => handleValueChange('enableAutoKotPrinting', val)}/></div>
            {formSettings.enableAutoKotPrinting && (
                <div className="p-4 border rounded-md bg-muted/50 space-y-4">
                    <div><Label>Print Mode</Label><RadioGroup value={formSettings.autoKotPrintMode || 'immediate'} onValueChange={(val) => handleValueChange('autoKotPrintMode', val as 'immediate' | 'batch')} className="flex gap-4 mt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="immediate" id="immediate"/><Label htmlFor="immediate">Immediate</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="batch" id="batch"/><Label htmlFor="batch">Batch</Label></div></RadioGroup></div>
                    {formSettings.autoKotPrintMode === 'batch' && (
                        <div><Label htmlFor="kotThreshold">Print KOT after N orders</Label><Input id="kotThreshold" type="number" min="2" value={formSettings.kotBatchPrintThreshold || 2} onChange={(e) => handleValueChange('kotBatchPrintThreshold', Number(e.target.value))}/><p className="text-xs text-muted-foreground mt-1">KOTs will be printed in a batch once this number of new orders are pending in the kitchen.</p></div>
                    )}
                </div>
            )}
        </CardContent>
      </Card>
      </>)}

       <div className="flex justify-end mt-6">
            <Button onClick={handleSaveSettings} disabled={isSaving || isLoadingSettings}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('saveButtonText')}
            </Button>
       </div>
    </div>
  );
}
