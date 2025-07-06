
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AttendanceRecord, Employee, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAttendanceRecords, getEmployees } from '@/app/actions/data-management-actions';
import { markAttendance } from '@/app/actions/hr-actions';
import { sendAttendanceReportByEmail, downloadAttendanceReportCsv } from '@/app/actions/reporting-actions';
import { format, parseISO, isValid, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYesterday, endOfYesterday, isEqual, isToday } from 'date-fns';
import { UserPlus, PlusCircle, CalendarClock, Loader2, RefreshCw, Mail, FileDown, CalendarDays, PackageSearch } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AttendanceManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  
  const [manualEntryEmployeeId, setManualEntryEmployeeId] = useState<string>('');
  const [manualEntryNotes, setManualEntryNotes] = useState<string>('');
  const [isManualEntryDialogOpen, setIsManualEntryDialogOpen] = useState(false);

  // Date Filtering State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Reporting State
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportRecipientEmail, setReportRecipientEmail] = useState("");
  const [reportDateRangeOption, setReportDateRangeOption] = useState("last7days");
  const [reportCustomDateFrom, setReportCustomDateFrom] = useState<Date | undefined>(subDays(new Date(), 6));
  const [reportCustomDateTo, setReportCustomDateTo] = useState<Date | undefined>(new Date());
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [records, emps] = await Promise.all([getAttendanceRecords(), getEmployees()]);
      setAttendanceRecords(records.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setEmployees(emps);
    } catch (error) {
      toast({ title: "Error", description: "Could not load attendance data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
    if(user?.email) {
      setReportRecipientEmail(user.email);
    }
  }, [fetchData, user]);

  const filteredRecords = useMemo(() => {
    if (!selectedDate) return attendanceRecords;
    return attendanceRecords.filter(record => 
        isEqual(parseISO(record.date), startOfDay(selectedDate))
    );
  }, [attendanceRecords, selectedDate]);

  const handleManualMarkAttendance = async () => {
    if (!manualEntryEmployeeId) {
      toast({ title: "Error", description: "Please select an employee.", variant: "destructive" });
      return;
    }
    setIsMarking(true);
    const result = await markAttendance(manualEntryEmployeeId, `Manual entry by ${user?.name || 'admin'}. Notes: ${manualEntryNotes}`);
    if (result.success) {
      toast({ title: "Attendance Marked", description: result.message });
      fetchData(); // Refresh data
      setIsManualEntryDialogOpen(false);
      setManualEntryEmployeeId('');
      setManualEntryNotes('');
    } else {
      toast({ title: "Failed to Mark Attendance", description: result.message, variant: "destructive" });
    }
    setIsMarking(false);
  };

  const getStatusBadgeVariant = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'Present': return 'default';
      case 'Late': return 'secondary';
      case 'On Leave': return 'outline';
      case 'Absent': return 'destructive';
      default: return 'secondary';
    }
  };
  
  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.employeeId === employeeId)?.name || 'Unknown Employee';
  };
  
  const getDateRangeForReport = (): { from: string; to: string } => {
    const today = new Date();
    switch (reportDateRangeOption) {
      case 'today': return { from: startOfDay(today).toISOString(), to: endOfDay(today).toISOString() };
      case 'yesterday': return { from: startOfYesterday().toISOString(), to: endOfYesterday().toISOString() };
      case 'last7days': return { from: startOfDay(subDays(today, 6)).toISOString(), to: endOfDay(today).toISOString() };
      case 'last30days': return { from: startOfDay(subDays(today, 29)).toISOString(), to: endOfDay(today).toISOString() };
      case 'thisMonth': return { from: startOfMonth(today).toISOString(), to: endOfDay(today).toISOString() };
      case 'lastMonth':
        const startOfLastMonth = startOfMonth(subDays(today, today.getDate()));
        return { from: startOfMonth(startOfLastMonth).toISOString(), to: endOfMonth(startOfLastMonth).toISOString() };
      case 'custom':
        if (!reportCustomDateFrom || !reportCustomDateTo || reportCustomDateTo < reportCustomDateFrom) {
            toast({ title: "Error", description: "Valid custom date range is required.", variant: "destructive" });
            throw new Error("Invalid custom date range");
        }
        return { from: startOfDay(reportCustomDateFrom).toISOString(), to: endOfDay(reportCustomDateTo).toISOString() };
      default:
        throw new Error("Invalid date range option");
    }
  };

  const handleSendReport = async () => {
    if (!reportRecipientEmail) {
      toast({ title: "Error", description: "Recipient email is required.", variant: "destructive" });
      return;
    }
    try {
        const dateRange = getDateRangeForReport();
        setIsSendingReport(true);
        const result = await sendAttendanceReportByEmail({ recipientEmail: reportRecipientEmail, dateRange });
        if (result.success) {
            toast({ title: "Report Sent", description: `Attendance report sent to ${reportRecipientEmail}. ${result.messageId === 'mock_message_id' ? '(Mocked for Console)' : ''}` });
            setIsReportDialogOpen(false);
        } else {
            toast({ title: "Failed to Send Report", description: result.message, variant: "destructive" });
        }
    } catch (error) { /* Toast already shown in getDateRangeForReport */ } 
    finally { setIsSendingReport(false); }
  };
  
  const handleDownloadReport = async () => {
    try {
        const dateRange = getDateRangeForReport();
        setIsDownloadingReport(true);
        const csvContent = await downloadAttendanceReportCsv({ dateRange });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const fromDateStr = format(parseISO(dateRange.from), 'yyyy-MM-dd');
        const toDateStr = format(parseISO(dateRange.to), 'yyyy-MM-dd');
        link.setAttribute("download", `attendance-report-${fromDateStr}-to-${toDateStr}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsReportDialogOpen(false);
    } catch (error) { /* Toast already shown in getDateRangeForReport */ }
    finally { setIsDownloadingReport(false); }
  };


  return (
    <div className="space-y-8">
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Generate Attendance Report</DialogTitle><DialogDescription>Select a date range and choose to email or download the report.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2"><Label htmlFor="reportDateRangeOption">Date Range</Label><Select value={reportDateRangeOption} onValueChange={setReportDateRangeOption}><SelectTrigger id="reportDateRangeOption"><SelectValue placeholder="Select date range" /></SelectTrigger><SelectContent><SelectItem value="today">Today</SelectItem><SelectItem value="yesterday">Yesterday</SelectItem><SelectItem value="last7days">Last 7 Days</SelectItem><SelectItem value="last30days">Last 30 Days</SelectItem><SelectItem value="thisMonth">This Month</SelectItem><SelectItem value="lastMonth">Last Month</SelectItem><SelectItem value="custom">Custom Range</SelectItem></SelectContent></Select></div>
            {reportDateRangeOption === 'custom' && (<div className="grid grid-cols-2 gap-2"><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("justify-start text-left font-normal", !reportCustomDateFrom && "text-muted-foreground")}><CalendarDays className="mr-2 h-4 w-4" />{reportCustomDateFrom ? format(reportCustomDateFrom, "PPP") : <span>From date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={reportCustomDateFrom} onSelect={setReportCustomDateFrom} initialFocus /></PopoverContent></Popover><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("justify-start text-left font-normal", !reportCustomDateTo && "text-muted-foreground")}><CalendarDays className="mr-2 h-4 w-4" />{reportCustomDateTo ? format(reportCustomDateTo, "PPP") : <span>To date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={reportCustomDateTo} onSelect={setReportCustomDateTo} disabled={(date) => reportCustomDateFrom ? date < reportCustomDateFrom : false} initialFocus /></PopoverContent></Popover></div>)}
            <div className="space-y-2"><Label htmlFor="reportRecipientEmail">Recipient Email (for sending)</Label><Input id="reportRecipientEmail" type="email" value={reportRecipientEmail} onChange={(e) => setReportRecipientEmail(e.target.value)} placeholder="admin@example.com" /></div>
          </div>
          <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-2"><Button type="button" onClick={handleDownloadReport} variant="secondary" disabled={isDownloadingReport || isSendingReport}>{isDownloadingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} <FileDown className="mr-2 h-4 w-4"/>Download CSV</Button><div className="flex gap-2"><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" onClick={handleSendReport} disabled={isSendingReport || isDownloadingReport}>{isSendingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} <Mail className="mr-2 h-4 w-4"/>Email Report</Button></div></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center"><CalendarClock className="mr-3 h-7 w-7" /> Attendance Log</h1>
          <p className="text-muted-foreground">View and manage employee check-in and check-out records.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin': ''}`} /> Refresh</Button>
           {user?.role === 'superadmin' && (
            <><Button onClick={() => setIsReportDialogOpen(true)}><FileDown className="mr-2 h-4 w-4" /> Generate Report</Button><Dialog open={isManualEntryDialogOpen} onOpenChange={setIsManualEntryDialogOpen}><DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Manual Entry</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Manual Attendance Entry</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div><Label htmlFor="manualEmployeeSelect">Select Employee</Label><Select value={manualEntryEmployeeId} onValueChange={setManualEntryEmployeeId}><SelectTrigger id="manualEmployeeSelect"><SelectValue placeholder="Select an employee..."/></SelectTrigger><SelectContent>{employees.map(emp => (<SelectItem key={emp.id} value={emp.employeeId}>{emp.name} ({emp.employeeId})</SelectItem>))}</SelectContent></Select></div><div><Label htmlFor="manualNotes">Notes (Optional)</Label><Textarea id="manualNotes" value={manualEntryNotes} onChange={(e) => setManualEntryNotes(e.target.value)} placeholder="Reason for manual entry..."/></div></div><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleManualMarkAttendance} disabled={isMarking || !manualEntryEmployeeId}>{isMarking && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Mark Check-in/out</Button></DialogFooter></DialogContent></Dialog></>
           )}
        </div>
      </div>

       <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Filter Records by Date</CardTitle>
          <CardDescription>Select a date to view attendance records for that day.</CardDescription>
        </CardHeader>
        <CardContent>
            <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border p-0"
                initialFocus
            />
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Attendance for {selectedDate ? format(selectedDate, "PPP") : "..."}</CardTitle>
          <CardDescription>Records are sorted by most recent date.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : filteredRecords.length > 0 ? (
            <ScrollArea className="h-96">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Check-in</TableHead>
                            <TableHead>Check-out</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecords.map(record => (
                            <TableRow key={record.id}>
                                <TableCell className="font-medium">{getEmployeeName(record.employeeId)} ({record.employeeId})</TableCell>
                                <TableCell>{record.checkInTime ? format(parseISO(record.checkInTime), 'h:mm:ss a') : 'N/A'}</TableCell>
                                <TableCell>{record.checkOutTime ? format(parseISO(record.checkOutTime), 'h:mm:ss a') : 'N/A'}</TableCell>
                                <TableCell><Badge variant={getStatusBadgeVariant(record.status)}>{record.status}</Badge></TableCell>
                                <TableCell className="text-xs text-muted-foreground">{record.notes || 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
          ) : (
             <div className="text-center py-16 text-muted-foreground">
                <PackageSearch className="h-16 w-16 mx-auto mb-4"/>
                No attendance records found for the selected date.
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
