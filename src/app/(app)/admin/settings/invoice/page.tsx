
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Printer, MessageSquare, Save, PlusCircle, Trash2, TestTube2, Loader2, Eye, Info, MailCheck, Smartphone, Star, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import InvoicePreview from '@/components/invoice/InvoicePreview';
import type { Order, PrinterSetting, InvoiceSetupSettings, PrintableInvoiceData, PrintableInvoiceDataWithAdjustments } from '@/lib/types';
import { defaultInvoiceSetupSettings } from "@/lib/types";
import { sendTestPrintCommand } from "@/app/actions/printer-actions";
import { getPrinterSettings, savePrinterSettings, saveGeneralSettings as saveGeneralSettingsAction } from "@/app/actions/data-management-actions";
import { useGeneralSettings } from "@/context/GeneralSettingsContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateInvoiceQuote } from "@/ai/flows/generate-invoice-quote";


const defaultNewPrinterValues: Omit<PrinterSetting, 'id' | 'name'> = {
  connectionType: 'network',
  ipAddress: '192.168.1.100',
  port: '9100',
  paperWidth: '80mm',
  autoCut: 'partial_cut',
  linesBeforeCut: '2',
  openCashDrawer: 'disabled',
  dpi: '203',
};

const mockOrderForPreview: Order = {
  id: 'ORD-PREVIEW-123',
  items: [
    { menuItemId: 'item-1', name: 'Special Pasta', quantity: 2, price: 15.99, note: "Extra cheese" },
    { menuItemId: 'item-2', name: 'Deluxe Burger', quantity: 1, price: 12.50 },
    { menuItemId: 'item-3', name: 'Fresh Lemonade', quantity: 3, price: 3.00, note: "Less sugar" },
  ],
  total: (2 * 15.99) + 12.50 + (3*3.00), 
  status: 'Completed',
  orderType: 'Dine-in',
  customerName: 'Guest User',
  createdAt: "2024-01-15T10:30:00.000Z", 
  tableNumber: 'T7',
  paymentType: 'Card',
  paymentId: "txn_123abc"
};

interface InvoiceDeliveryDisplaySettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
}

const PREDEFINED_PAPER_WIDTHS = ['58mm', '80mm', '104mm'];
const PREDEFINED_DPIS = ['203', '300', '600'];


export default function InvoiceSettingsPage() {
  const { toast } = useToast();
  const { settings: generalSettings, isLoadingSettings: isLoadingGeneralSettings, refreshGeneralSettings } = useGeneralSettings();

  const [printers, setPrinters] = useState<PrinterSetting[]>([]);
  const [editingPrinterId, setEditingPrinterId] = useState<string | undefined>(undefined);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(true);
  const [isSavingPrinters, setIsSavingPrinters] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [currentPreviewDate, setCurrentPreviewDate] = useState<string | null>(null);

  const [invoiceDeliveryDisplay, setInvoiceDeliveryDisplay] = useState<InvoiceDeliveryDisplaySettings>({
    emailEnabled: true, 
    smsEnabled: false,
    whatsappEnabled: false,
  });

  const [customPaperWidthValue, setCustomPaperWidthValue] = useState("");
  const [customDpiValue, setCustomDpiValue] = useState("");

  const [previewFooterText1, setPreviewFooterText1] = useState<string | undefined>(generalSettings.invoiceFooterText1);
  const [isLoadingAiQuote, setIsLoadingAiQuote] = useState(false);


  const currentEditingPrinter = useMemo(() => printers.find(p => p.id === editingPrinterId), [printers, editingPrinterId]);
  
  const isCustomPaperWidthSelected = useMemo(() => {
    if (!currentEditingPrinter) return false;
    return !PREDEFINED_PAPER_WIDTHS.includes(currentEditingPrinter.paperWidth);
  }, [currentEditingPrinter]);

  const isCustomDpiSelected = useMemo(() => {
    if (!currentEditingPrinter) return false;
    return !PREDEFINED_DPIS.includes(currentEditingPrinter.dpi);
  }, [currentEditingPrinter]);

  useEffect(() => {
    async function fetchPrinters() {
      setIsLoadingPrinters(true);
      try {
        const fetchedPrinters = await getPrinterSettings();
        setPrinters(fetchedPrinters);
        if (fetchedPrinters.length > 0 && !editingPrinterId) {
          setEditingPrinterId(fetchedPrinters[0].id);
        } else if (fetchedPrinters.length === 0) {
          setEditingPrinterId(undefined);
        }
      } catch (error) {
        console.error("Error loading printer settings:", error);
        toast({ title: "Error", description: "Could not load printer settings from server.", variant: "destructive" });
      } finally {
        setIsLoadingPrinters(false);
      }
    }
    fetchPrinters();
    setCurrentPreviewDate(new Date().toLocaleDateString()); 
  }, [toast]);

  useEffect(() => {
    if (printers.length > 0 && editingPrinterId && !printers.find(p => p.id === editingPrinterId)) {
      setEditingPrinterId(printers[0]?.id);
    } else if (printers.length === 0 && editingPrinterId) {
      setEditingPrinterId(undefined);
    }
  }, [printers, editingPrinterId]);

  useEffect(() => {
    if (currentEditingPrinter) {
      if (isCustomPaperWidthSelected) {
        setCustomPaperWidthValue(currentEditingPrinter.paperWidth);
      } else {
        setCustomPaperWidthValue("");
      }
      if (isCustomDpiSelected) {
        setCustomDpiValue(currentEditingPrinter.dpi);
      } else {
        setCustomDpiValue("");
      }
    }
  }, [currentEditingPrinter, isCustomPaperWidthSelected, isCustomDpiSelected]);

  useEffect(() => {
    const updatePreviewQuote = async () => {
      if (!isLoadingGeneralSettings) {
        setIsLoadingAiQuote(true);
        if (generalSettings.autoGenerateInvoiceFooterQuote) {
          try {
            const aiQuoteResult = await generateInvoiceQuote({
              language: generalSettings.invoiceFooterQuoteLanguage || 'en',
              restaurantName: generalSettings.companyName,
            });
            setPreviewFooterText1(aiQuoteResult.quote);
          } catch (aiError) {
            console.error("AI Quote generation failed for settings page preview:", aiError);
            setPreviewFooterText1(generalSettings.invoiceFooterText1); // Fallback
          }
        } else {
          setPreviewFooterText1(generalSettings.invoiceFooterText1);
        }
        setIsLoadingAiQuote(false);
      }
    };
    updatePreviewQuote();
  }, [generalSettings, isLoadingGeneralSettings]);


  const handlePrinterSettingChange = (field: keyof Omit<PrinterSetting, 'id'>, value: string | boolean) => {
    if (!editingPrinterId) return;
    setPrinters(prevPrinters => 
        prevPrinters.map(p => {
            if (p.id === editingPrinterId) {
                const updatedPrinter = { ...p, [field]: value };
                if (field === 'paperWidth') {
                    if (PREDEFINED_PAPER_WIDTHS.includes(String(value))) {
                        setCustomPaperWidthValue(""); 
                    }
                }
                if (field === 'dpi') {
                     if (PREDEFINED_DPIS.includes(String(value))) {
                        setCustomDpiValue("");
                    }
                }
                if (field === 'connectionType' && value === 'system') {
                  updatedPrinter.ipAddress = '';
                  updatedPrinter.port = '';
                }
                return updatedPrinter;
            }
            return p;
        })
    );
  };
  
  const handleCustomPaperWidthInputChange = (value: string) => {
    setCustomPaperWidthValue(value);
    if (editingPrinterId) {
        setPrinters(prevPrinters =>
            prevPrinters.map(p => p.id === editingPrinterId ? { ...p, paperWidth: value } : p)
        );
    }
  };

  const handleCustomDpiInputChange = (value: string) => {
    setCustomDpiValue(value);
    if (editingPrinterId) {
        setPrinters(prevPrinters =>
            prevPrinters.map(p => p.id === editingPrinterId ? { ...p, dpi: value } : p)
        );
    }
  };


  const handleAddPrinter = () => {
    const newPrinterName = `New Printer ${printers.length + 1}`;
    const newPrinter: PrinterSetting = {
      id: crypto.randomUUID(),
      name: newPrinterName,
      ...defaultNewPrinterValues,
    };
    setPrinters(prev => [...prev, newPrinter]);
    setEditingPrinterId(newPrinter.id);
    toast({ title: "New Printer Added (Locally)", description: `${newPrinterName} configuration started. Save all configurations to persist.`});
  };

  const handleDeletePrinter = () => {
    if (!editingPrinterId) return;
     if (generalSettings.defaultThermalPrinterId === editingPrinterId) {
        toast({ title: "Cannot Delete", description: "This printer is set as the default thermal printer. Change the default first.", variant: "destructive" });
        return;
    }
    const remainingPrinters = printers.filter(p => p.id !== editingPrinterId);
    setPrinters(remainingPrinters);
    setEditingPrinterId(remainingPrinters.length > 0 ? remainingPrinters[0].id : undefined);
    toast({ title: "Printer Deleted (Locally)", description: `Printer configuration removed. Save all configurations to persist.`});
  };

  const handleClearCurrentPrinterSettings = () => {
     if (!editingPrinterId) return;
     setPrinters(prevPrinters => 
        prevPrinters.map(p => p.id === editingPrinterId ? {
            ...defaultNewPrinterValues,
            id: p.id, 
            name: p.name 
        } : p)
    );
     toast({ title: "Settings Cleared (Locally)", description: `Settings for current printer reset to defaults. Save to persist.`});
  }

  const handleSavePrinterConfigurations = async () => {
    setIsSavingPrinters(true);
    try {
      const result = await savePrinterSettings(printers);
      if (result.success) {
        toast({
          title: "Printer Configurations Saved",
          description: `${result.count} printer configurations saved to server. ${result.message}`,
        });
      } else {
        toast({ title: "Error Saving Printers", description: result.message, variant: "destructive" });
      }
    } catch (error) {
        console.error("Error saving printer settings:", error);
        toast({ title: "Error", description: "Could not save printer settings to server.", variant: "destructive"});
    } finally {
        setIsSavingPrinters(false);
    }
  };

  const handleSetAsDefaultThermalPrinter = async () => {
    if (!editingPrinterId || isLoadingGeneralSettings) {
        toast({ title: "Cannot Set Default", description: "No printer selected or general settings are still loading.", variant: "destructive" });
        return;
    }
    setIsSettingDefault(true);
    try {
        const updatedGeneralSettings: InvoiceSetupSettings = {
            ...generalSettings,
            defaultThermalPrinterId: editingPrinterId,
        };
        const result = await saveGeneralSettingsAction(updatedGeneralSettings);
        if (result.success) {
            await refreshGeneralSettings(); 
            toast({ title: "Default Thermal Printer Set", description: `${currentEditingPrinter?.name} is now the default for thermal printing.` });
        } else {
            toast({ title: "Error Setting Default", description: result.message, variant: "destructive" });
        }
    } catch (error) {
        toast({ title: "Error", description: "Could not set default thermal printer.", variant: "destructive" });
    } finally {
        setIsSettingDefault(false);
    }
  };


  const handleTestPrinter = async () => {
    if(!currentEditingPrinter) {
        toast({ title: "No Printer Selected", description: "Please select a printer to test.", variant: "destructive" });
        return;
    }
    if (currentEditingPrinter.connectionType === 'system') {
        toast({
            title: "Test System Printer",
            description: `To test a 'System Printer', use the "Print Web/PDF" button on the Invoice Preview section. This uses your OS's print dialog.`,
            duration: 10000
        });
        return;
    }
    if (currentEditingPrinter.connectionType !== 'network') {
        toast({
            title: "Test Print Information",
            description: `Direct backend test print is primarily for network printers. For ${currentEditingPrinter.connectionType} printers, test using local system utilities or the OS print dialog if applicable.`,
            variant: "default"
        });
        return;
    }

    setIsTestingPrinter(true);
    try {
        const printableTestData: PrintableInvoiceDataWithAdjustments = {
            ...(isLoadingGeneralSettings ? defaultInvoiceSetupSettings : generalSettings),
            invoiceFooterText1: previewFooterText1, 
            order: mockOrderForPreview,
        };

        const result = await sendTestPrintCommand({ printer: currentEditingPrinter, invoiceData: printableTestData });

        if (result.success) {
            toast({ title: "Test Print Command Sent", description: result.message, duration: 7000 });
        } else {
            toast({ title: "Test Print Command Failed", description: result.message + (result.details ? ` Details: ${result.details}` : ''), variant: "destructive", duration: 10000 });
        }
    } catch (error) {
        console.error("Error sending test print command:", error);
        toast({ title: "Test Print Error", description: (error as Error).message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsTestingPrinter(false);
    }
  }

  const handleInvoiceDeliveryDisplayChange = (field: keyof InvoiceDeliveryDisplaySettings, value: boolean) => {
    setInvoiceDeliveryDisplay(prev => ({ ...prev, [field]: value }));
  };

  const printableDataForPreview: PrintableInvoiceData | null = useMemo(() => {
    if (isLoadingGeneralSettings || isLoadingAiQuote) return null;
    return {
        ...generalSettings,
        invoiceFooterText1: previewFooterText1,
        order: mockOrderForPreview,
    }
  }, [generalSettings, isLoadingGeneralSettings, previewFooterText1, isLoadingAiQuote]);


  if (isLoadingGeneralSettings || isLoadingPrinters) {
    return (
      <div className="space-y-8">
         <Button variant="outline" asChild className="mb-4">
          <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Invoice & Receipt Settings</h1>
        </div>
        <Card><CardContent className="p-6 text-center flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading settings...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <Button variant="outline" asChild className="mb-4">
          <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">Invoice & Receipt Settings</h1>
        <p className="text-muted-foreground">Configure thermal printers and invoice delivery. General invoice content is in General Settings. Printer settings are saved to server CSV.</p>
      </div>
      
      {printableDataForPreview ? (
      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="font-headline flex items-center"><Eye className="mr-2 h-5 w-5 text-accent"/>Invoice Preview</CardTitle>
            <CardDescription>Conceptual representation based on General Settings. Date: {currentPreviewDate || "Loading..."}</CardDescription>
        </CardHeader>
        <CardContent className="bg-muted/30 p-4 rounded-lg">
            <Tabs defaultValue="pdf" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="pdf">PDF/Web</TabsTrigger>
                    <TabsTrigger value="thermal">Thermal</TabsTrigger>
                    <TabsTrigger value="email">Email</TabsTrigger>
                </TabsList>
                <TabsContent value="pdf">
                    <InvoicePreview data={printableDataForPreview} previewType="pdf" id="settings-invoice-preview-pdf"/>
                </TabsContent>
                <TabsContent value="thermal">
                     <InvoicePreview data={printableDataForPreview} previewType="thermal" id="settings-invoice-preview-thermal" />
                </TabsContent>
                <TabsContent value="email">
                    <InvoicePreview data={printableDataForPreview} previewType="email" id="settings-invoice-preview-email" />
                     <p className="text-xs text-muted-foreground mt-2 text-center">Email preview often resembles PDF/Web but might have simplified styling for email client compatibility.</p>
                </TabsContent>
            </Tabs>
            <p className="text-xs text-muted-foreground mt-4 text-center">This is a simplified preview. Actual print/email output may vary.</p>
        </CardContent>
      </Card>
      ) : (
        <Card className="shadow-xl"><CardHeader><CardTitle>Invoice Preview</CardTitle></CardHeader><CardContent className="p-6 text-center flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading preview data...</CardContent></Card>
      )}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Printer className="mr-2 h-5 w-5 text-accent"/>Thermal Printer Configuration</CardTitle>
          <CardDescription>Set up ESC/POS standard printers. Changes are local until "Save All Printer Configurations" is clicked.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-grow space-y-2">
                    <Label htmlFor="printerList">Printer Profile</Label>
                    <Select value={editingPrinterId} onValueChange={setEditingPrinterId} disabled={printers.length === 0}>
                        <SelectTrigger id="printerList">
                            <SelectValue placeholder="Select a printer profile" />
                        </SelectTrigger>
                        <SelectContent>
                        {printers.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.name} {generalSettings.defaultThermalPrinterId === p.id && <Star className="inline h-3 w-3 ml-1 text-yellow-500 fill-yellow-400" />}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button variant="outline" onClick={handleAddPrinter} size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add Printer</Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={!editingPrinterId || generalSettings.defaultThermalPrinterId === editingPrinterId}>
                            <Trash2 className="mr-2 h-4 w-4"/> Delete Current
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitleComponent>Are you sure?</AlertDialogTitleComponent>
                        <AlertDialogDescription>
                            This action will mark the printer profile "{currentEditingPrinter?.name}" for deletion. This change will be saved to the server when you click "Save All Printer Configurations".
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePrinter}>Delete Locally</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {currentEditingPrinter && (
                <div className="space-y-6 pt-4 border-t mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                        <Label htmlFor="printerName">Printer Name</Label>
                        <Input
                            id="printerName"
                            value={currentEditingPrinter.name}
                            onChange={(e) => handlePrinterSettingChange('name', e.target.value)}
                            placeholder="e.g., Kitchen Printer"
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="connectionType">Connection Type</Label>
                        <Select
                            value={currentEditingPrinter.connectionType}
                            onValueChange={(value) => handlePrinterSettingChange('connectionType', value as PrinterSetting['connectionType'])}
                        >
                            <SelectTrigger id="connectionType">
                            <SelectValue placeholder="Select connection type" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="network">Network (IP)</SelectItem>
                            <SelectItem value="usb">USB (Direct backend test N/A)</SelectItem>
                            <SelectItem value="bluetooth">Bluetooth (Direct backend test N/A)</SelectItem>
                            <SelectItem value="system">System Printer (Uses OS dialog)</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                    </div>
                    {currentEditingPrinter.connectionType === 'network' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="ipAddress">IP Address</Label>
                                <Input
                                    id="ipAddress"
                                    value={currentEditingPrinter.ipAddress}
                                    onChange={(e) => handlePrinterSettingChange('ipAddress', e.target.value)}
                                    placeholder="e.g., 192.168.1.101"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">Port</Label>
                                <Input
                                    id="port"
                                    value={currentEditingPrinter.port}
                                    onChange={(e) => handlePrinterSettingChange('port', e.target.value)}
                                    placeholder="e.g., 9100"
                                />
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Paper Width</Label>
                        <RadioGroup
                            value={isCustomPaperWidthSelected ? "other" : currentEditingPrinter.paperWidth}
                            onValueChange={(value) => {
                                if (value === "other") {
                                    handlePrinterSettingChange('paperWidth', customPaperWidthValue || "80mm"); 
                                } else {
                                    handlePrinterSettingChange('paperWidth', value);
                                }
                            }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            {PREDEFINED_PAPER_WIDTHS.map(width => (
                                <div key={width} className="flex items-center space-x-2">
                                <RadioGroupItem value={width} id={`pw-${width}`} />
                                <Label htmlFor={`pw-${width}`} className="font-normal">{width}</Label>
                                </div>
                            ))}
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="other" id="pw-other" />
                                <Label htmlFor="pw-other" className="font-normal">Other</Label>
                            </div>
                        </RadioGroup>
                        {isCustomPaperWidthSelected && (
                            <div className="mt-2 pl-6">
                                <Label htmlFor="customPaperWidth" className="text-xs">Custom Width (e.g., 72mm)</Label>
                                <Input 
                                    id="customPaperWidth" 
                                    value={customPaperWidthValue} 
                                    onChange={(e) => handleCustomPaperWidthInputChange(e.target.value)}
                                    placeholder="e.g., 72mm" 
                                    className="h-8 text-sm"
                                />
                            </div>
                        )}
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="printerDPI">Printer DPI</Label>
                            <Select 
                                value={isCustomDpiSelected ? "custom_dpi" : currentEditingPrinter.dpi}
                                onValueChange={(value) => {
                                    if (value === "custom_dpi") {
                                        handlePrinterSettingChange('dpi', customDpiValue || "203"); 
                                    } else {
                                        handlePrinterSettingChange('dpi', value);
                                    }
                                }}
                            >
                                <SelectTrigger id="printerDPI"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PREDEFINED_DPIS.map(dpi => <SelectItem key={dpi} value={dpi}>{dpi} DPI</SelectItem>)}
                                    <SelectItem value="custom_dpi">Other (Manual Input)</SelectItem>
                                </SelectContent>
                            </Select>
                            {isCustomDpiSelected && (
                                <div className="mt-2">
                                    <Label htmlFor="customDpiInput" className="text-xs">Custom DPI Value</Label>
                                    <Input 
                                        id="customDpiInput"
                                        type="number"
                                        value={customDpiValue}
                                        onChange={(e) => handleCustomDpiInputChange(e.target.value)}
                                        placeholder="e.g., 250"
                                        className="h-8 text-sm"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="autoCut">Auto Cut Paper</Label>
                            <Select value={currentEditingPrinter.autoCut} onValueChange={(v) => handlePrinterSettingChange('autoCut', v as PrinterSetting['autoCut'])}>
                                <SelectTrigger id="autoCut"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Cut</SelectItem>
                                    <SelectItem value="partial_cut">Partial Cut</SelectItem>
                                    <SelectItem value="full_cut">Full Cut</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="linesBeforeCut">Lines to Feed Before Cut</Label>
                            <Select value={currentEditingPrinter.linesBeforeCut} onValueChange={(v) => handlePrinterSettingChange('linesBeforeCut', v as PrinterSetting['linesBeforeCut'])}>
                                <SelectTrigger id="linesBeforeCut"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['0', '1', '2', '3', '4', '5'].map(n => <SelectItem key={n} value={n}>{n} Lines</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="openCashDrawer">Open Cash Drawer</Label>
                            <Select value={currentEditingPrinter.openCashDrawer} onValueChange={(v) => handlePrinterSettingChange('openCashDrawer', v as PrinterSetting['openCashDrawer'])}>
                                <SelectTrigger id="openCashDrawer"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                    <SelectItem value="before_print">Before Print</SelectItem>
                                    <SelectItem value="after_print">After Print</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-4 border-t items-center">
                        <Button variant="outline" onClick={handleClearCurrentPrinterSettings} disabled={isSavingPrinters} size="sm"><Edit2 className="mr-2 h-3 w-3"/>Clear Current</Button>
                        <Button variant="secondary" onClick={handleTestPrinter} disabled={isTestingPrinter || isSavingPrinters} size="sm">
                            {isTestingPrinter ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <TestTube2 className="mr-2 h-4 w-4"/>}
                            Test Printer
                        </Button>
                        <Button 
                            onClick={handleSetAsDefaultThermalPrinter} 
                            disabled={isSettingDefault || isSavingPrinters || isLoadingGeneralSettings || generalSettings.defaultThermalPrinterId === editingPrinterId}
                            variant={generalSettings.defaultThermalPrinterId === editingPrinterId ? "default" : "outline"}
                            className={generalSettings.defaultThermalPrinterId === editingPrinterId ? "bg-green-600 hover:bg-green-700" : ""}
                            size="sm"
                        >
                            {isSettingDefault ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Star className="mr-2 h-4 w-4"/>}
                            {generalSettings.defaultThermalPrinterId === editingPrinterId ? "Is Default Thermal Printer" : "Set as Default Thermal"}
                        </Button>
                    </div>
                </div>
            )}
            {!currentEditingPrinter && printers.length > 0 && <p className="text-muted-foreground py-4">Select a printer profile to edit its settings.</p>}
            {printers.length === 0 && <p className="text-muted-foreground py-4">No printer profiles configured. Click "Add Printer" to create one.</p>}
        </CardContent>
        <CardFooter>
           <Button onClick={handleSavePrinterConfigurations} size="sm" className="ml-auto" disabled={isSavingPrinters}>
            {isSavingPrinters ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
             Save All Printer Configurations to Server
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-accent"/>Invoice Delivery Options (Informational)</CardTitle>
          <CardDescription>Configuration for email/SMS/WhatsApp providers is done via server environment variables.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="sendViaEmailSwitch" className="flex flex-col space-y-1">
              <span className="flex items-center"><MailCheck className="mr-2 h-4 w-4 text-green-600"/>Send via Email</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Invoice emails are sent using the configured SMTP server (see .env).
              </span>
            </Label>
            <Switch id="sendViaEmailSwitch" checked={invoiceDeliveryDisplay.emailEnabled} onCheckedChange={(val) => handleInvoiceDeliveryDisplayChange('emailEnabled', val)} aria-label="Toggle Email Delivery"/>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
            <Label htmlFor="sendViaSmsSwitch" className="flex flex-col space-y-1 opacity-60">
                <span className="flex items-center"><Smartphone className="mr-2 h-4 w-4 text-gray-400"/>Send via SMS</span>
                 <span className="font-normal leading-snug text-muted-foreground text-xs">
                    SMS functionality is not yet implemented. Requires SMS provider setup.
                </span>
            </Label>
             <Switch id="sendViaSmsSwitch" checked={invoiceDeliveryDisplay.smsEnabled} onCheckedChange={(val) => handleInvoiceDeliveryDisplayChange('smsEnabled', val)} aria-label="Toggle SMS Delivery" disabled/>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
            <Label htmlFor="sendViaWhatsAppSwitch" className="flex flex-col space-y-1 opacity-60">
                <span className="flex items-center"><Smartphone className="mr-2 h-4 w-4 text-gray-400"/>Send via WhatsApp</span>
                 <span className="font-normal leading-snug text-muted-foreground text-xs">
                    WhatsApp functionality is not yet implemented. Requires WhatsApp API setup.
                </span>
            </Label>
            <Switch id="sendViaWhatsAppSwitch" checked={invoiceDeliveryDisplay.whatsappEnabled} onCheckedChange={(val) => handleInvoiceDeliveryDisplayChange('whatsappEnabled', val)} aria-label="Toggle WhatsApp Delivery" disabled/>
          </div>
          <Alert variant="default" className="bg-sky-50 border-sky-300">
            <Info className="h-5 w-5 text-sky-600" />
            <AlertTitle className="font-semibold text-sky-700">SMTP Configuration Note</AlertTitle>
            <AlertDescription className="text-sky-600">
                Email sending relies on SMTP settings in your server's <code>.env</code> file (<code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>EMAIL_FROM</code>). Ensure these are correctly configured for email delivery to work.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

    