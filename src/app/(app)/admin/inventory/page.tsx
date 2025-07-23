
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { StockItem } from "@/lib/types";
import { BASE_CURRENCY_CODE, ALL_STOCK_UNITS } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Archive, PlusCircle, Edit3, Trash2, ListFilter, Loader2, MoreVertical, Save, PackageSearch, Mail, CalendarDays, SlidersHorizontal, FileText } from "lucide-react"; // Added Mail, CalendarDays, SlidersHorizontal
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter as DialogFooterComponent,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader as AlertDialogHeaderComponent,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader as TableHeaderComponent, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getStockItems, saveStockItems as saveStockItemsAction } from "@/app/actions/data-management-actions";
import { sendExpenseInventoryReportByEmail } from "@/app/actions/reporting-actions";
import { StockItemEditor } from '@/components/admin/StockItemEditor';
import { format, parseISO, isValid, startOfDay, endOfDay, isWithinInterval, subDays, startOfMonth, endOfMonth, startOfYesterday } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { cn } from "@/lib/utils";


export default function InventoryManagementPage() {
  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<Partial<StockItem> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [filterValues, setFilterValues] = useState({
    category: 'all',
    unit: 'all',
    stockStatus: 'all', // 'all', 'low', 'ok'
  });

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportRecipientEmail, setReportRecipientEmail] = useState("");
  const [reportDateRangeOption, setReportDateRangeOption] = useState("last7days"); // Date range for expenses part of report
  const [reportCustomDateFrom, setReportCustomDateFrom] = useState<Date | undefined>(undefined);
  const [reportCustomDateTo, setReportCustomDateTo] = useState<Date | undefined>(undefined);
  const [isSendingManualReport, setIsSendingManualReport] = useState(false);


  const existingItemNames = useMemo(() => stockItems.map(item => item.name), [stockItems]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const items = await getStockItems();
        setStockItems(items);
      } catch (error) {
        toast({ title: "Error", description: "Could not load stock items.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleSaveStockItem = (data: StockItem) => {
    setStockItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === data.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated;
      }
      return [...prev, data];
    });
    toast({ title: "Stock Item Saved Locally", description: `Item "${data.name}" ${data.id === editingStockItem?.id ? 'updated' : 'added'}. Save all to persist.` });
    setIsEditorOpen(false);
    setEditingStockItem(undefined);
  };

  const handleOpenEditor = (item?: StockItem) => {
    setEditingStockItem(item);
    setIsEditorOpen(true);
  };

  const handleDeleteStockItem = (id: string) => {
    setStockItems(prev => prev.filter(item => item.id !== id));
    toast({ title: "Stock Item Deleted Locally", description: "Save all changes to persist this deletion.", variant: "destructive" });
  };

  const handleSaveAllToCsv = async () => {
    setIsSaving(true);
    try {
      const result = await saveStockItemsAction(stockItems);
      if (result.success) {
        toast({ title: "Stock Items Saved", description: "All stock item changes have been saved to CSV." });
      } else {
        toast({ title: "Error Saving Stock Items", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save stock items.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilterChange = (filterName: keyof typeof filterValues, value: string) => {
    setFilterValues(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterValues({ category: 'all', unit: 'all', stockStatus: 'all' });
  };

  const uniqueCategories = useMemo(() => ['all', ...Array.from(new Set(stockItems.map(item => item.category).filter(Boolean).sort()))], [stockItems]);
  const uniqueUnits = useMemo(() => ['all', ...ALL_STOCK_UNITS], []);

  const filteredStockItems = useMemo(() => {
    return stockItems.filter(item => {
      const searchMatch = searchTerm.toLowerCase() === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const categoryMatch = filterValues.category === 'all' || item.category === filterValues.category;
      const unitMatch = filterValues.unit === 'all' || item.unit === filterValues.unit;
      
      let stockStatusMatch = true;
      if (filterValues.stockStatus === 'low') {
        stockStatusMatch = item.currentStock <= item.reorderLevel;
      } else if (filterValues.stockStatus === 'ok') {
        stockStatusMatch = item.currentStock > item.reorderLevel;
      }
      
      return searchMatch && categoryMatch && unitMatch && stockStatusMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [stockItems, searchTerm, filterValues]);

  const handleOpenReportDialog = () => {
    setReportRecipientEmail("");
    setReportDateRangeOption("last7days");
    setReportCustomDateFrom(undefined);
    setReportCustomDateTo(undefined);
    setIsReportDialogOpen(true);
  };

  const handleSendManualReport = async () => {
    if (!reportRecipientEmail) {
      toast({ title: "Error", description: "Recipient email is required.", variant: "destructive" });
      return;
    }
    let dateRange;
    const today = new Date();
    switch (reportDateRangeOption) {
      case 'today':
        dateRange = { from: startOfDay(today).toISOString(), to: endOfDay(today).toISOString() };
        break;
      case 'yesterday':
        dateRange = { from: startOfYesterday().toISOString(), to: endOfDay(startOfYesterday()).toISOString() };
        break;
      case 'last7days':
        dateRange = { from: startOfDay(subDays(today, 6)).toISOString(), to: endOfDay(today).toISOString() };
        break;
      case 'last30days':
        dateRange = { from: startOfDay(subDays(today, 29)).toISOString(), to: endOfDay(today).toISOString() };
        break;
      case 'thisMonth':
        dateRange = { from: startOfMonth(today).toISOString(), to: endOfDay(today).toISOString() };
        break;
      case 'lastMonth':
        const startOfLastMonth = startOfMonth(subDays(today, today.getDate()));
        dateRange = { from: startOfMonth(startOfLastMonth).toISOString(), to: endOfMonth(startOfLastMonth).toISOString() };
        break;
      case 'custom':
        if (!reportCustomDateFrom || !reportCustomDateTo || reportCustomDateTo < reportCustomDateFrom) {
          toast({ title: "Error", description: "Valid custom date range is required for expenses part of the report.", variant: "destructive" });
          return;
        }
        dateRange = { from: startOfDay(reportCustomDateFrom).toISOString(), to: endOfDay(reportCustomDateTo).toISOString() };
        break;
      default:
        toast({ title: "Error", description: "Invalid date range option.", variant: "destructive" });
        return;
    }

    setIsSendingManualReport(true);
    try {
      const result = await sendExpenseInventoryReportByEmail({
        recipientEmail: reportRecipientEmail,
        dateRange,
        reportTriggerContext: "Manual Request from Inventory Page"
      });
      if (result.success) {
        toast({ title: "Report Sent", description: `Inventory & Expense report sent to ${reportRecipientEmail}. ${result.messageId === 'mock_message_id' ? '(Mocked for Console)' : ''}` });
        setIsReportDialogOpen(false);
      } else {
        toast({ title: "Failed to Send Report", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error Sending Report", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSendingManualReport(false);
    }
  };


  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setEditingStockItem(undefined);}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {editingStockItem?.id ? `Edit Stock Item: ${editingStockItem.name}` : "Create New Stock Item"}
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && (
            <StockItemEditor 
              stockItem={editingStockItem} 
              onSave={handleSaveStockItem} 
              onClose={() => setIsEditorOpen(false)}
              existingItemNames={editingStockItem?.id ? existingItemNames.filter(name => name.toLowerCase() !== editingStockItem.name?.toLowerCase()) : existingItemNames}
            />
          )}
        </DialogContent>
      </Dialog>

       <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Inventory & Expense Report</DialogTitle>
            <DialogDescriptionComponent>
              Specify recipient and date range (for expenses). Inventory is current snapshot.
            </DialogDescriptionComponent>
          </DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="reportRecipientEmailInv">Recipient Email *</Label>
              <Input
                id="reportRecipientEmailInv"
                type="email"
                value={reportRecipientEmail}
                onChange={(e) => setReportRecipientEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportDateRangeOptionInv">Date Range (for Expenses) *</Label>
              <Select value={reportDateRangeOption} onValueChange={setReportDateRangeOption}>
                <SelectTrigger id="reportDateRangeOptionInv">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportDateRangeOption === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("justify-start text-left font-normal", !reportCustomDateFrom && "text-muted-foreground")}>
                      <CalendarDays className="mr-2 h-4 w-4" />{reportCustomDateFrom ? format(reportCustomDateFrom, "PPP") : <span>From date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={reportCustomDateFrom} onSelect={setReportCustomDateFrom} initialFocus /></PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("justify-start text-left font-normal", !reportCustomDateTo && "text-muted-foreground")}>
                      <CalendarDays className="mr-2 h-4 w-4" />{reportCustomDateTo ? format(reportCustomDateTo, "PPP") : <span>To date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={reportCustomDateTo} onSelect={setReportCustomDateTo} disabled={(date) => reportCustomDateFrom ? date < reportCustomDateFrom : false} initialFocus /></PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <DialogFooterComponent>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSendManualReport} disabled={isSendingManualReport}>
              {isSendingManualReport && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Send Report
            </Button>
          </DialogFooterComponent>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <Archive className="mr-3 h-7 w-7" /> Inventory Management
          </h1>
          <p className="text-muted-foreground">Track stock items, reorder levels, and suppliers. Prices in {BASE_CURRENCY_CODE}.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => handleOpenEditor()} className="flex-grow sm:flex-grow-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Button>
            <Button onClick={handleOpenReportDialog} variant="outline" className="flex-grow sm:flex-grow-0">
                <Mail className="mr-2 h-4 w-4" /> Send Report
            </Button>
            <Button onClick={handleSaveAllToCsv} disabled={isSaving || isLoading} className="flex-grow sm:flex-grow-0">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save All to CSV
            </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="font-headline">Stock Items ({stockItems.length})</CardTitle>
                <CardDescription>Changes are local until "Save All to CSV" is clicked.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <Input
                    placeholder="Search by name, category, supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:w-52"
                />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4"/> Filters</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 z-50" align="end">
                        <div className="grid gap-4">
                        <div className="space-y-2"><h4 className="font-medium leading-none">Filter Options</h4></div>
                        <div className="grid gap-3">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterCategory">Category</Label>
                                <Select value={filterValues.category} onValueChange={(value) => handleFilterChange('category', value)}>
                                    <SelectTrigger id="filterCategory" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueCategories.map(c => <SelectItem key={c} value={c} className="capitalize">{c === 'all' ? 'All Categories' : c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterUnit">Unit</Label>
                                <Select value={filterValues.unit} onValueChange={(value) => handleFilterChange('unit', value)}>
                                    <SelectTrigger id="filterUnit" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueUnits.map(u => <SelectItem key={u} value={u} className="capitalize">{u === 'all' ? 'All Units' : u}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterStockStatus">Stock Status</Label>
                                <Select value={filterValues.stockStatus} onValueChange={(value) => handleFilterChange('stockStatus', value)}>
                                    <SelectTrigger id="filterStockStatus" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Stock Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="low">Low Stock</SelectItem>
                                        <SelectItem value="ok">OK Stock</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading stock items...</span></div>
          ) : filteredStockItems.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <Table>
                <TableHeaderComponent>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock / Unit</TableHead>
                    <TableHead>Reorder Lvl</TableHead>
                    <TableHead>Price ({currencySymbol})</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Last Purchased</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeaderComponent>
                <TableBody>
                  {filteredStockItems.map((item) => (
                    <TableRow key={item.id} className={item.currentStock <= item.reorderLevel ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                      <TableCell className="font-semibold text-primary">{item.name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{item.category}</Badge></TableCell>
                      <TableCell>{item.currentStock} <span className="text-xs text-muted-foreground">{item.unit}</span></TableCell>
                      <TableCell>{item.reorderLevel}</TableCell>
                      <TableCell>{currencySymbol}{convertPrice(item.purchasePrice).toFixed(2)}</TableCell>
                      <TableCell className="text-xs truncate max-w-[100px]" title={item.supplier}>{item.supplier || 'N/A'}</TableCell>
                      <TableCell className="text-xs">
                        {item.lastPurchaseDate && isValid(parseISO(item.lastPurchaseDate)) ? format(parseISO(item.lastPurchaseDate), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditor(item)}><Edit3 className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeaderComponent><AlertDialogTitleComponent>Delete "{item.name}"?</AlertDialogTitleComponent>
                                  <AlertDialogDescription>This will mark the item for deletion. Save all to CSV to make it permanent.</AlertDialogDescription>
                                </AlertDialogHeaderComponent>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteStockItem(item.id)}>Delete Locally</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-16">
              <PackageSearch className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Stock Items Found</h2>
              <p className="text-muted-foreground">
                {searchTerm || Object.values(filterValues).some(v => v !== 'all' && v !== '') ? 
                 "No items match your current search/filter criteria." : 
                 "Your inventory is empty. Click 'Add New Item' to start."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
       <div className="mt-4 text-xs text-muted-foreground">
            Purchase prices are stored in {BASE_CURRENCY_CODE} and displayed in your selected currency ({currencySymbol}).
       </div>
    </div>
  );
}
