
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Expense, ExpenseCategory, RecurrenceType } from "@/lib/types";
import { BASE_CURRENCY_CODE, ALL_EXPENSE_CATEGORIES, ALL_RECURRENCE_TYPES } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit3, Trash2, ListFilter, Loader2, MoreVertical, Save, CreditCard as ExpenseIcon, PackageSearch, CalendarDays, SlidersHorizontal, FileText, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionComponent,
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
import { getExpenses, saveExpenses as saveExpensesAction } from "@/app/actions/data-management-actions";
import { sendExpenseInventoryReportByEmail } from "@/app/actions/reporting-actions";
import { ExpenseEditor } from '@/components/admin/ExpenseEditor';
import { format, parseISO, isValid, startOfDay, endOfDay, isWithinInterval, subDays, startOfMonth, endOfMonth, startOfYesterday, endOfYesterday } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { cn } from "@/lib/utils";


export default function ExpenseManagementPage() {
  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [filterValues, setFilterValues] = useState({
    category: 'all',
    dateRangeFrom: undefined as Date | undefined,
    dateRangeTo: undefined as Date | undefined,
    isRecurring: 'all', // 'all', 'yes', 'no'
  });

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportRecipientEmail, setReportRecipientEmail] = useState("");
  const [reportDateRangeOption, setReportDateRangeOption] = useState("last7days");
  const [reportCustomDateFrom, setReportCustomDateFrom] = useState<Date | undefined>(undefined);
  const [reportCustomDateTo, setReportCustomDateTo] = useState<Date | undefined>(undefined);
  const [isSendingManualReport, setIsSendingManualReport] = useState(false);


  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const items = await getExpenses();
        setExpenses(items.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      } catch (error) {
        toast({ title: "Error", description: "Could not load expenses.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleSaveExpense = (data: Expense) => {
    setExpenses(prev => {
      const existingIndex = prev.findIndex(item => item.id === data.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = data;
        return updated.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
      }
      return [...prev, data].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    });
    toast({ title: "Expense Saved Locally", description: `Expense "${data.description.substring(0,20)}..." ${data.id === editingExpense?.id ? 'updated' : 'added'}. Save all to persist.` });
    setIsEditorOpen(false);
    setEditingExpense(undefined);
  };

  const handleOpenEditor = (item?: Expense) => {
    setEditingExpense(item);
    setIsEditorOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(item => item.id !== id));
    toast({ title: "Expense Deleted Locally", description: "Save all changes to persist this deletion.", variant: "destructive" });
  };

  const handleSaveAllToCsv = async () => {
    setIsSaving(true);
    try {
      const result = await saveExpensesAction(expenses);
      if (result.success) {
        toast({ title: "Expenses Saved", description: "All expense changes have been saved to CSV." });
      } else {
        toast({ title: "Error Saving Expenses", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save expenses.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFilterChange = (filterName: keyof typeof filterValues, value: string | Date | undefined) => {
    setFilterValues(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterValues({ category: 'all', dateRangeFrom: undefined, dateRangeTo: undefined, isRecurring: 'all' });
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const searchMatch = searchTerm.toLowerCase() === '' ||
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.notes && expense.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const categoryMatch = filterValues.category === 'all' || expense.category === filterValues.category;
      
      let dateMatch = true;
      if (expense.date) {
        try {
          const expenseDateOnly = parseISO(expense.date);
          if (isValid(expenseDateOnly)) {
            if (filterValues.dateRangeFrom && filterValues.dateRangeTo) {
              dateMatch = isWithinInterval(expenseDateOnly, { start: startOfDay(filterValues.dateRangeFrom), end: endOfDay(filterValues.dateRangeTo) });
            } else if (filterValues.dateRangeFrom) {
              dateMatch = expenseDateOnly >= startOfDay(filterValues.dateRangeFrom);
            } else if (filterValues.dateRangeTo) {
              dateMatch = expenseDateOnly <= endOfDay(filterValues.dateRangeTo);
            }
          } else { dateMatch = !filterValues.dateRangeFrom && !filterValues.dateRangeTo; }
        } catch (e) { dateMatch = !filterValues.dateRangeFrom && !filterValues.dateRangeTo; }
      } else { dateMatch = !filterValues.dateRangeFrom && !filterValues.dateRangeTo; }

      const recurringMatch = filterValues.isRecurring === 'all' ||
        (filterValues.isRecurring === 'yes' && expense.isRecurring) ||
        (filterValues.isRecurring === 'no' && !expense.isRecurring);
      
      return searchMatch && categoryMatch && dateMatch && recurringMatch;
    });
  }, [expenses, searchTerm, filterValues]);

  const formatRecurrenceInfo = (expense: Expense) => {
    if (!expense.isRecurring) return "No";
    let info = expense.recurrenceType ? expense.recurrenceType.charAt(0).toUpperCase() + expense.recurrenceType.slice(1) : "Yes";
    if (expense.recurrenceEndDate) {
      info += ` until ${format(parseISO(expense.recurrenceEndDate), 'MMM d, yyyy')}`;
    }
    return info;
  };

  const handleOpenReportDialog = () => {
    setReportRecipientEmail(""); // Reset for new dialog
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
        dateRange = { from: startOfYesterday().toISOString(), to: endOfYesterday().toISOString() };
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
        const startOfLastMonth = startOfMonth(subDays(today, today.getDate())); // Go to start of current month, then back one day to get into last month
        dateRange = { from: startOfMonth(startOfLastMonth).toISOString(), to: endOfMonth(startOfLastMonth).toISOString() };
        break;
      case 'custom':
        if (!reportCustomDateFrom || !reportCustomDateTo || reportCustomDateTo < reportCustomDateFrom) {
          toast({ title: "Error", description: "Valid custom date range is required.", variant: "destructive" });
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
        reportTriggerContext: "Manual Request from Expenses Page"
      });
      if (result.success) {
        toast({ title: "Report Sent", description: `Expense & Inventory report sent to ${reportRecipientEmail}. ${result.messageId === 'mock_message_id' ? '(Mocked for Console)' : ''}` });
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
      <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setEditingExpense(undefined);}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {editingExpense?.id ? `Edit Expense: ${(editingExpense.description || '').substring(0,20)}...` : "Record New Expense"}
            </DialogTitle>
          </DialogHeader>
          {isEditorOpen && (
            <ExpenseEditor 
              expense={editingExpense} 
              onSave={handleSaveExpense} 
              onClose={() => setIsEditorOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Expense & Inventory Report</DialogTitle>
            <DialogDescription>
              Specify recipient and date range for the report. Inventory will be a current snapshot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="reportRecipientEmail">Recipient Email *</Label>
              <Input
                id="reportRecipientEmail"
                type="email"
                value={reportRecipientEmail}
                onChange={(e) => setReportRecipientEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportDateRangeOption">Date Range (for Expenses) *</Label>
              <Select value={reportDateRangeOption} onValueChange={setReportDateRangeOption}>
                <SelectTrigger id="reportDateRangeOption">
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
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSendManualReport} disabled={isSendingManualReport}>
              {isSendingManualReport && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Send Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <ExpenseIcon className="mr-3 h-7 w-7" /> Expense Management
          </h1>
          <p className="text-muted-foreground">Record and track business expenses. Prices in ${BASE_CURRENCY_CODE}.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => handleOpenEditor()} className="flex-grow sm:flex-grow-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Expense
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
                <CardTitle className="font-headline">Recorded Expenses ({expenses.length})</CardTitle>
                <CardDescription>Changes are local until "Save All to CSV" is clicked.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <Input
                    placeholder="Search by description, category, notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:w-52"
                />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4"/> Filters</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 z-50" align="end">
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
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {ALL_EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="filterRecurring">Recurring</Label>
                                <Select value={filterValues.isRecurring} onValueChange={(value) => handleFilterChange('isRecurring', value)}>
                                    <SelectTrigger id="filterRecurring" className="col-span-2 h-8">
                                        <SelectValue placeholder="Select Option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <Label>Date Range</Label>
                                <div className="grid grid-cols-2 gap-2">
                                     <Popover>
                                        <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={`h-8 justify-start text-left font-normal ${!filterValues.dateRangeFrom && "text-muted-foreground"}`}>
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            {filterValues.dateRangeFrom ? format(filterValues.dateRangeFrom, "MMM d, yyyy") : <span>From Date</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterValues.dateRangeFrom} onSelect={(d) => handleFilterChange('dateRangeFrom', d)} initialFocus /></PopoverContent>
                                    </Popover>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={`h-8 justify-start text-left font-normal ${!filterValues.dateRangeTo && "text-muted-foreground"}`}>
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            {filterValues.dateRangeTo ? format(filterValues.dateRangeTo, "MMM d, yyyy") : <span>To Date</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterValues.dateRangeTo} onSelect={(d) => handleFilterChange('dateRangeTo', d)} disabled={(date) => filterValues.dateRangeFrom ? date < filterValues.dateRangeFrom : false} initialFocus /></PopoverContent>
                                    </Popover>
                                </div>
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
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading expenses...</span></div>
          ) : filteredExpenses.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <Table>
                <TableHeaderComponent>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount ({currencySymbol})</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeaderComponent>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-xs">{isValid(parseISO(expense.date)) ? format(parseISO(expense.date), 'MMM d, yyyy') : 'Invalid Date'}</TableCell>
                      <TableCell className="font-semibold text-primary max-w-[200px] truncate" title={expense.description}>{expense.description}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{expense.category}</Badge></TableCell>
                      <TableCell>${currencySymbol}${convertPrice(expense.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{formatRecurrenceInfo(expense)}</TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]" title={expense.notes}>{expense.notes || 'N/A'}</TableCell>
                      <TableCell>
                        {expense.receiptUrl ? 
                          <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                            <FileText className="inline mr-1 h-3 w-3"/>View
                          </a> : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEditor(expense)}><Edit3 className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeaderComponent><AlertDialogTitleComponent>Delete Expense: "{expense.description.substring(0,20)}..."?</AlertDialogTitleComponent>
                                  <AlertDialogDescriptionComponent>This will mark the expense for deletion. Save all to CSV to make it permanent.</AlertDialogDescriptionComponent>
                                </AlertDialogHeaderComponent>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>Delete Locally</AlertDialogAction></AlertDialogFooter>
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
              <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Expenses Recorded</h2>
              <p className="text-muted-foreground">
                {searchTerm || Object.values(filterValues).some(v => v !== 'all' && v !== undefined && v !== '') ? 
                 "No expenses match your current search/filter criteria." : 
                 "No expenses recorded yet. Click 'Add New Expense' to start."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
       <div className="mt-4 text-xs text-muted-foreground">
            Expense amounts are stored in ${BASE_CURRENCY_CODE} and displayed in your selected currency (${currencySymbol}).
       </div>
    </div>
  );
}
    

    