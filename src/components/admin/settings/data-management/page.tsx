// src/app/(app)/admin/settings/data-management/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, DownloadCloud, UploadCloud, FileText, Users, ClipboardList, Loader2, DollarSign, Settings2, Printer, CalendarDays, Columns3, ShieldCheck, Tag, Gift, GalleryHorizontal, Image as ImageIconLucide, Archive, CreditCard as ExpenseIcon, Link2, Gauge, Database, AlertTriangle, Info, Wifi, WifiOff, BedDouble, Rocket, DatabaseZap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import { 
  downloadMenuItemsCsv, uploadMenuItemsCsv,
  downloadOrdersCsv, uploadOrdersCsv,
  downloadUsersCsv, uploadUsersCsv,
  downloadConversionRatesCsv, uploadConversionRatesCsv,
  downloadGeneralSettingsCsv, uploadGeneralSettingsCsv,
  downloadPrinterSettingsCsv, uploadPrinterSettingsCsv,
  downloadBookingsCsv, uploadBookingsCsv,
  downloadRestaurantTablesCsv, uploadRestaurantTablesCsv,
  downloadRoomsCsv, uploadRoomsCsv,
  downloadRolePermissionsCsv, uploadRolePermissionsCsv,
  downloadDiscountsCsv, uploadDiscountsCsv,
  downloadOffersCsv, uploadOffersCsv,
  downloadBannersCsv, uploadBannersCsv,
  downloadManagedImagesCsv, uploadManagedImagesCsv,
  downloadStockItemsCsv, uploadStockItemsCsv,
  downloadExpensesCsv, uploadExpensesCsv,
  downloadStockMenuMappingsCsv, uploadStockMenuMappingsCsv,
  downloadRateLimitConfigCsv, uploadRateLimitConfigCsv,
  getDataSource, getDbConnectionStatus,
  migrateCsvToMongo
} from "@/app/actions/data-management-actions";
import { useCurrencyRates } from "@/context/CurrencyRatesContext";
import { useGeneralSettings } from "@/context/GeneralSettingsContext";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type DataSourceType = "csv" | "mongodb" | "firebase" | "localstorage";

const DATA_TYPES = [
  { id: "GeneralSettings", name: "General Settings", icon: Settings2, downloadFn: downloadGeneralSettingsCsv, uploadFn: uploadGeneralSettingsCsv, fileType: '.json' },
  { id: "PrinterSettings", name: "Printer Settings", icon: Printer, downloadFn: downloadPrinterSettingsCsv, uploadFn: uploadPrinterSettingsCsv, fileType: '.csv' },
  { id: "MenuItems", name: "Menu Items", icon: FileText, downloadFn: downloadMenuItemsCsv, uploadFn: uploadMenuItemsCsv, fileType: '.csv' },
  { id: "RestaurantTables", name: "Restaurant Tables", icon: Columns3, downloadFn: downloadRestaurantTablesCsv, uploadFn: uploadRestaurantTablesCsv, fileType: '.csv' },
  { id: "Rooms", name: "Rooms", icon: BedDouble, downloadFn: downloadRoomsCsv, uploadFn: uploadRoomsCsv, fileType: '.csv' },
  { id: "Orders", name: "Orders", icon: ClipboardList, downloadFn: downloadOrdersCsv, uploadFn: uploadOrdersCsv, fileType: '.csv' },
  { id: "Users", name: "Users", icon: Users, downloadFn: downloadUsersCsv, uploadFn: uploadUsersCsv, fileType: '.csv' },
  { id: "Bookings", name: "Bookings", icon: CalendarDays, downloadFn: downloadBookingsCsv, uploadFn: uploadBookingsCsv, fileType: '.csv' },
  { id: "ConversionRates", name: "Currency Rates", icon: DollarSign, downloadFn: downloadConversionRatesCsv, uploadFn: uploadConversionRatesCsv, fileType: '.json' },
  { id: "RolePermissions", name: "Role Permissions", icon: ShieldCheck, downloadFn: downloadRolePermissionsCsv, uploadFn: uploadRolePermissionsCsv, fileType: '.csv' },
  { id: "RateLimitConfig", name: "Rate Limit Config", icon: Gauge, downloadFn: downloadRateLimitConfigCsv, uploadFn: uploadRateLimitConfigCsv, fileType: '.csv' },
  { id: "Discounts", name: "Discount Codes", icon: Tag, downloadFn: downloadDiscountsCsv, uploadFn: uploadDiscountsCsv, fileType: '.csv' },
  { id: "Offers", name: "Offers", icon: Gift, downloadFn: downloadOffersCsv, uploadFn: uploadOffersCsv, fileType: '.csv' },
  { id: "Banners", name: "Banners", icon: GalleryHorizontal, downloadFn: downloadBannersCsv, uploadFn: uploadBannersCsv, fileType: '.csv' },
  { id: "ManagedImages", name: "Managed Images", icon: ImageIconLucide, downloadFn: downloadManagedImagesCsv, uploadFn: uploadManagedImagesCsv, fileType: '.csv' },
  { id: "StockItems", name: "Stock Items", icon: Archive, downloadFn: downloadStockItemsCsv, uploadFn: uploadStockItemsCsv, fileType: '.csv' },
  { id: "Expenses", name: "Expenses", icon: ExpenseIcon, downloadFn: downloadExpensesCsv, uploadFn: uploadExpensesCsv, fileType: '.csv' },
  { id: "StockMenuMappings", name: "Stock-Menu Mappings", icon: Link2, downloadFn: downloadStockMenuMappingsCsv, uploadFn: uploadStockMenuMappingsCsv, fileType: '.csv' },
] as const;


export default function DataManagementPage() {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const { refreshRates } = useCurrencyRates(); 
  const { refreshGeneralSettings } = useGeneralSettings(); 
  const [activeDataSource, setActiveDataSource] = useState<string>('loading');
  const [dbStatus, setDbStatus] = useState<{ isConnected: boolean; message: string }>({ isConnected: false, message: 'Checking...' });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    async function fetchDataSourceStatus() {
        setIsLoadingStatus(true);
        try {
            const source = await getDataSource();
            setActiveDataSource(source);
            if (source === 'mongodb') {
                const status = await getDbConnectionStatus();
                setDbStatus(status);
            }
        } catch (error) {
            setActiveDataSource('unknown');
            setDbStatus({ isConnected: false, message: 'Failed to fetch status.' });
            toast({ title: 'Error', description: 'Could not determine data source status.' });
        }
        setIsLoadingStatus(false);
    }
    fetchDataSourceStatus();
  }, [toast, isMounted]);

  const handleDownload = async (dataType: typeof DATA_TYPES[number]['id']) => {
    const action = DATA_TYPES.find(dt => dt.id === dataType);
    if (!action || !action.downloadFn) return;

    setIsDownloading(dataType);
    try {
      const content = await action.downloadFn();
      const mimeType = action.fileType === '.json' ? 'application/json' : 'text/csv';
      const fileName = `${dataType.toLowerCase().replace(/([a-z])([A-Z])/g, '$1-$2')}${action.fileType}`;

      if (content) {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
        const link = document.createElement("a");
        if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", fileName);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        toast({
          title: `Downloaded ${action.name} File`,
          description: `${fileName} has been downloaded.`,
        });
      } else {
        toast({
          title: `Error Downloading ${action.name}`,
          description: `Could not retrieve ${action.name.toLowerCase()} data. File might be empty or an error occurred.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Error downloading ${dataType} file:`, error);
      toast({
        title: `Error Downloading ${action.name} File`,
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, dataType: typeof DATA_TYPES[number]['id']) => {
    const file = event.target.files?.[0];
    const action = DATA_TYPES.find(dt => dt.id === dataType);
    if (!action || !action.uploadFn) return;
    
    if (file) {
      setIsUploading(dataType);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileString = e.target?.result as string;
        let response;
        try {
          response = await action.uploadFn(fileString);

          if (response?.success) {
            toast({
              title: `Uploaded ${action.name} Data`,
              description: response.message,
            });
            if (dataType === "ConversionRates") await refreshRates();
            if (dataType === "GeneralSettings") await refreshGeneralSettings();
          } else {
            toast({
              title: `Error Uploading ${action.name} Data`,
              description: response?.message || `Failed to upload and process the data for ${action.name}.`,
              variant: "destructive",
            });
          }
        } catch (uploadError) {
           toast({
              title: `Error Uploading ${action.name} Data`,
              description: (uploadError as Error).message || "An unexpected error occurred during upload.",
              variant: "destructive",
            });
        } finally {
          setIsUploading(null);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = ""; 
  };
  
  const handleMigrate = async () => {
    setIsMigrating(true);
    const result = await migrateCsvToMongo();
    if(result.success) {
      toast({
        title: "Migration Successful",
        description: "All data from CSV files has been copied to MongoDB. Please update your .env file and restart the server.",
        duration: 10000
      });
    } else {
      toast({
        title: "Migration Failed",
        description: result.message,
        variant: "destructive",
        duration: 10000
      });
    }
    setIsMigrating(false);
  };
  
  const renderDataSourceInfo = () => {
    if (activeDataSource === 'mongodb') {
      return (
        <Alert variant={dbStatus.isConnected ? "default" : "destructive"} className={dbStatus.isConnected ? "bg-green-50 border-green-400" : ""}>
          {dbStatus.isConnected ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-destructive" />}
          <AlertTitle className={cn("font-semibold", dbStatus.isConnected ? "text-green-700" : "")}>Data Source: MongoDB</AlertTitle>
          <AlertDescription className={cn(dbStatus.isConnected ? "text-green-600" : "")}>
            {dbStatus.message} To switch back to CSV, set `DATA_SOURCE=csv` in your `.env` file and restart the server.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert variant="default" className="bg-sky-50 border-sky-300">
        <Info className="h-5 w-5 text-sky-600" />
        <AlertTitle className="font-semibold text-sky-700">Data Source: CSV Files</AlertTitle>
        <AlertDescription className="text-sky-600">
          The application is currently configured to use server-side CSV files for data storage.
          To switch to MongoDB, set `DATA_SOURCE=mongodb` in your `.env` file and restart the server.
        </AlertDescription>
      </Alert>
    );
  };
  
  const DataSourceCardSkeleton = () => (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
          <Database className="mr-2 h-5 w-5 text-accent"/>
          <Skeleton className="h-6 w-48" />
        </CardTitle>
        <CardDescription><Skeleton className="h-4 w-full" /></CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );

  const DataActionCardSkeleton = () => (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-lg text-primary flex items-center">
          <Skeleton className="h-6 w-6 mr-2 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">Data Management</h1>
        <p className="text-muted-foreground">Manage application data source and perform import/export operations.</p>
      </div>

       {isLoadingStatus || !isMounted ? <DataSourceCardSkeleton /> : (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center"><Database className="mr-2 h-5 w-5 text-accent"/>Active Data Source</CardTitle>
                    <CardDescription>The current data storage method for the application, configured via environment variables.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderDataSourceInfo()}
                </CardContent>
            </Card>
       )}
      
       {activeDataSource === 'csv' && (
        <Card className="shadow-lg border-primary/40">
            <CardHeader>
                <CardTitle className="font-headline flex items-center text-primary"><Rocket className="mr-2 h-5 w-5"/>Upgrade to MongoDB</CardTitle>
                <CardDescription>Migrate your local CSV data to a MongoDB database for a more robust and scalable solution.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <AlertTriangle className="h-4 w-4"/>
                    <AlertTitle>Important: Two-Step Process</AlertTitle>
                    <AlertDescription>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                            <li><strong>Step 1: Migrate Data.</strong> Click the button below. This will read all your local CSV data and write it to the MongoDB database specified in your <code>.env</code> file.</li>
                            <li><strong>Step 2: Update Environment.</strong> After a successful migration, set <code>DATA_SOURCE=mongodb</code> in your <code>.env</code> file and restart the application server.</li>
                        </ol>
                    </AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleMigrate} disabled={isMigrating}>
                    {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
                    {isMigrating ? "Migrating Data..." : "Migrate All CSV Data to MongoDB"}
                 </Button>
            </CardFooter>
        </Card>
       )}
       
        <div className="space-y-6">
          <Alert variant="default">
            <Info className="h-5 w-5" />
            <AlertTitle className="font-semibold">Import / Export Data</AlertTitle>
            <AlertDescription>
              Download or upload data for specific modules below. This works for both CSV and MongoDB data sources.
              When uploading, ensure file formats match existing structures. Uploading will replace existing data for that module.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingStatus || !isMounted ? (
                Array.from({ length: 18 }).map((_, i) => <DataActionCardSkeleton key={i} />)
            ) : (
                DATA_TYPES.map(dt => (
                <Card key={dt.id} className="shadow-md">
                    <CardHeader>
                    <CardTitle className="font-headline text-lg text-primary flex items-center">
                        <dt.icon className="mr-2 h-5 w-5 text-accent"/>{dt.name}
                    </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                    <Button onClick={() => handleDownload(dt.id)} className="w-full" disabled={isDownloading === dt.id}>
                        {isDownloading === dt.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                        Download as {dt.fileType.toUpperCase()}
                    </Button>
                    <div>
                        <Label htmlFor={`upload-${dt.id}-File`} className="sr-only">Upload {dt.name} {dt.fileType.toUpperCase()}</Label>
                        <Input id={`upload-${dt.id}-File`} type="file" accept={dt.fileType} onChange={(e) => handleUpload(e, dt.id)} className="text-xs" disabled={isUploading === dt.id}/>
                        {isUploading === dt.id && <div className="flex items-center text-xs text-muted-foreground mt-1"><Loader2 className="mr-1 h-3 w-3 animate-spin"/>Uploading...</div>}
                    </div>
                    </CardContent>
                </Card>
                ))
            )}
          </div>
        </div>

      <CardFooter className="mt-6">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> When uploading files, ensure the format matches the downloaded template.
          Incorrectly formatted data may lead to errors or data corruption.
        </p>
      </CardFooter>
    </div>
  );
}
