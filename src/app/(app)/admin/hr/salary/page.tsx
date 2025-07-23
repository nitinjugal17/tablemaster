
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Employee, Order, InvoiceSetupSettings, AttendanceRecord, SalaryPayment, MenuItem, OrderItem } from '@/lib/types';
import { BASE_CURRENCY_CODE } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { getEmployees, getOrders, getGeneralSettings, getAttendanceRecords, getMenuItems, saveSalaryPayments } from '@/app/actions/data-management-actions';
import { Loader2, DollarSign, Download, AlertTriangle, FileArchive } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format, isWithinInterval, eachDayOfInterval, startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrency } from '@/hooks/useCurrency';
import Papa from 'papaparse';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DateRange } from 'react-day-picker';
import { parsePortionDetails } from '@/lib/utils'; // Import the utility

interface SalaryData {
  employeeId: string;
  name: string;
  baseSalaryForPeriod: number;
  bonusForPeriod: number;
  deductions: number;
  netPay: number;
}

export default function SalaryManagementPage() {
  const { toast } = useToast();
  const { user, isLoadingAuth } = useAuth();
  const { currencySymbol, convertPrice } = useCurrency();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<InvoiceSetupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const [salaryData, setSalaryData] = useState<SalaryData[]>([]);
  
  const fetchDataForPage = useCallback(async () => {
    if (isLoadingAuth) return;
    if (user?.role !== 'superadmin') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [emps, ords, stgs, atts, items] = await Promise.all([
        getEmployees(), 
        getOrders(), 
        getGeneralSettings(),
        getAttendanceRecords(),
        getMenuItems()
      ]);
      setEmployees(emps);
      setOrders(ords);
      setSettings(stgs);
      setAttendanceRecords(atts);
      setMenuItems(items);
    } catch (error) {
      toast({ title: "Error", description: "Could not load required data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user, isLoadingAuth]);

  useEffect(() => {
    fetchDataForPage();
  }, [fetchDataForPage]);

  const handleDeductionChange = (employeeId: string, value: string) => {
    const newDeduction = parseFloat(value) || 0;
    setSalaryData(prevData =>
      prevData.map(d => {
        if (d.employeeId === employeeId) {
          return { ...d, deductions: newDeduction, netPay: d.baseSalaryForPeriod + d.bonusForPeriod - newDeduction };
        }
        return d;
      })
    );
  };
  
  const handleCalculateSalaries = useCallback(async () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      toast({ title: "Prerequisites Missing", description: "A full date range is required.", variant: "destructive" });
      return;
    }

    setIsCalculating(true);
    
    // Re-fetch all data right before calculation for maximum accuracy
    toast({ title: "Fetching latest data...", description: "Getting up-to-date records before calculation.", duration: 2000 });
    const [
        latestEmployees, latestOrders, latestSettings, 
        latestAttendance, latestMenuItems
    ] = await Promise.all([
        getEmployees(), getOrders(), getGeneralSettings(),
        getAttendanceRecords(), getMenuItems()
    ]);

    if (!latestSettings || latestEmployees.length === 0) {
      toast({ title: "Prerequisites Missing", description: "Settings and employee data are required.", variant: "destructive" });
      setIsCalculating(false);
      return;
    }

    const newSalaryData: SalaryData[] = [];
    const intervalDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const employeeCount = latestEmployees.length > 0 ? latestEmployees.length : 1;
    
    const menuItemsWithBonusMap = new Map(latestMenuItems.filter(i => i.employeeBonusAmount && i.employeeBonusAmount > 0).map(i => [i.id, i.employeeBonusAmount!]));

    // Pre-calculate daily revenue bonus
    const dailyBonusMap = new Map<string, number>();
    for (const day of intervalDays) {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const todaysRevenue = latestOrders
        .filter(o => {
            try {
                const orderDate = typeof o.createdAt === 'string' ? parseISO(o.createdAt) : o.createdAt;
                if (!isValid(orderDate)) return false;
                return o.status === 'Completed' && isWithinInterval(orderDate, { start: dayStart, end: dayEnd });
            } catch { return false; }
        })
        .reduce((sum, o) => sum + o.total, 0);

      const threshold = latestSettings.dailyRevenueThreshold || 0;
      const bonusPercentage = latestSettings.bonusPercentageAboveThreshold || 0;
      const maxBonusPool = latestSettings.employeeBonusAmount || 0;
      let dailyBonusPerEmployee = 0;

      if (threshold > 0 && todaysRevenue > threshold && bonusPercentage > 0) {
          const revenueAboveThreshold = todaysRevenue - threshold;
          let calculatedBonusPool = revenueAboveThreshold * (bonusPercentage / 100);
          
          if (maxBonusPool > 0) {
              calculatedBonusPool = Math.min(calculatedBonusPool, maxBonusPool);
          }
          
          dailyBonusPerEmployee = calculatedBonusPool / employeeCount;
      }
      dailyBonusMap.set(day.toISOString().split('T')[0], dailyBonusPerEmployee);
    }
    
    // Calculate salary for each employee
    for (const employee of latestEmployees) {
      let baseSalaryForPeriod = 0;
      let dailyRevenueBonus = 0;
      let itemSpecificBonus = 0;

      const employeeAttendanceInRange = latestAttendance.filter(
        (att) =>
          att.employeeId === employee.employeeId &&
          isWithinInterval(parseISO(att.date), { start: dateRange.from!, end: dateRange.to! })
      );
      
      const presentDays = employeeAttendanceInRange.filter(att => att.status === 'Present' || att.status === 'Late').length;

      if (employee.baseSalary && employee.salaryCalculationType) {
        if (employee.salaryCalculationType === 'monthly') {
          baseSalaryForPeriod = (employee.baseSalary / 30) * presentDays;
        } else { // daily
          baseSalaryForPeriod = employee.baseSalary * presentDays;
        }
      }

      // Calculate Daily Revenue Bonus
      for (const day of intervalDays) {
          const dayString = format(day, 'yyyy-MM-dd');
          const wasPresent = employeeAttendanceInRange.some(att => att.date === dayString && (att.status === 'Present' || att.status === 'Late'));
          if (wasPresent) {
            dailyRevenueBonus += dailyBonusMap.get(day.toISOString().split('T')[0]) || 0;
          }
      }

      // Calculate Item-Specific Bonus
      if(employee.mappedUserId) {
        const employeeOrders = latestOrders.filter(o => {
          try {
            const orderDate = typeof o.createdAt === 'string' ? parseISO(o.createdAt) : o.createdAt;
            return o.status === 'Completed' && o.userId === employee.mappedUserId && isValid(orderDate) && isWithinInterval(orderDate, { start: dateRange.from!, end: dateRange.to! });
          } catch { return false; }
        });
        
        for (const order of employeeOrders) {
            const orderItemsArray: OrderItem[] = Array.isArray(order.items) 
                ? order.items 
                : (typeof order.items === 'string' ? JSON.parse(order.items) : []);

            for (const item of orderItemsArray) {
                if (menuItemsWithBonusMap.has(item.menuItemId)) {
                    itemSpecificBonus += (menuItemsWithBonusMap.get(item.menuItemId)! * item.quantity);
                }
            }
        }
      }
      
      const totalBonus = dailyRevenueBonus + itemSpecificBonus;

      newSalaryData.push({
        employeeId: employee.employeeId,
        name: employee.name,
        baseSalaryForPeriod,
        bonusForPeriod: totalBonus,
        deductions: 0,
        netPay: baseSalaryForPeriod + totalBonus,
      });
    }

    setSalaryData(newSalaryData);
    setIsCalculating(false);
    toast({ title: "Salaries Calculated", description: `Calculated for ${intervalDays.length} days based on attendance and sales.` });
  }, [dateRange, toast]);

  const handleDownloadCsv = () => {
    if (salaryData.length === 0 || !dateRange?.from || !dateRange?.to) {
      toast({ title: "No data to download", description: "Please calculate salaries for a valid date range first.", variant: "destructive" });
      return;
    }
    const dataForCsv = salaryData.map(d => ({
      "Employee ID": d.employeeId,
      "Employee Name": d.name,
      "Period Start": format(dateRange.from!, 'yyyy-MM-dd'),
      "Period End": format(dateRange.to!, 'yyyy-MM-dd'),
      "Base Salary": d.baseSalaryForPeriod.toFixed(2),
      "Bonus Earned": d.bonusForPeriod.toFixed(2),
      "Deductions/Additions": d.deductions.toFixed(2),
      "Net Payable": d.netPay.toFixed(2),
    }));
    const csv = Papa.unparse(dataForCsv);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `salary-report-${format(dateRange.from, 'yyyyMMdd')}-to-${format(dateRange.to, 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleMarkAsPaid = async () => {
    if (salaryData.length === 0 || !dateRange?.from || !dateRange?.to) {
      toast({ title: "No data to save", description: "Please calculate salaries first.", variant: "destructive" });
      return;
    }
    
    setIsCalculating(true); // Re-use isCalculating state for saving
    const paymentsToSave: SalaryPayment[] = salaryData.map(sd => ({
      id: `PAY-${sd.employeeId}-${Date.now()}`,
      paymentDate: new Date().toISOString(),
      periodFrom: dateRange.from!.toISOString(),
      periodTo: dateRange.to!.toISOString(),
      employeeId: sd.employeeId,
      employeeName: sd.name,
      baseSalaryForPeriod: sd.baseSalaryForPeriod,
      bonusForPeriod: sd.bonusForPeriod,
      deductions: sd.deductions,
      netPay: sd.netPay
    }));

    const result = await saveSalaryPayments(paymentsToSave);

    if (result.success) {
      toast({
        title: "Salaries Paid & Recorded",
        description: `Successfully recorded ${paymentsToSave.length} salary payment(s).`
      });
      setSalaryData([]); // Clear the current calculation
    } else {
      toast({
        title: "Error Recording Payments",
        description: result.message,
        variant: "destructive"
      });
    }
    setIsCalculating(false);
  }

  if (isLoading || isLoadingAuth) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (user?.role !== 'superadmin') {
    return (
      <div className="space-y-8">
        <Card className="shadow-xl border-destructive">
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-destructive flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">You do not have permission to access Salary Management.</p>
            <p className="text-muted-foreground">This section is for Super Administrators only.</p>
             <Button asChild variant="link" className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <DollarSign className="mr-3 h-7 w-7" /> Salary Management
        </h1>
        <Button asChild variant="outline">
          <Link href="/admin/hr/salary-history"><FileArchive className="mr-2 h-4 w-4" /> View Salary History</Link>
        </Button>
      </div>
       <p className="text-muted-foreground -mt-4">Calculate employee salaries including bonuses for a given period, based on attendance and sales.</p>
      
      <Alert variant="default" className="bg-sky-50 border-sky-300">
        <AlertTriangle className="h-5 w-5 text-sky-600" />
        <AlertTitle className="font-semibold text-sky-700">Salary Calculation Note</AlertTitle>
        <AlertDescription className="text-sky-600">
          Salary calculations depend on attendance records ('Present'/'Late' are paid days) and sales data. Bonuses can now be team-based (from daily revenue) and individual (from item-specific bonuses). Clicking "Mark as Paid" saves the calculated salaries to a permanent history log.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Calculation Period</CardTitle>
          <CardDescription>Select the date range for salary calculation.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
           <DateRangePicker date={dateRange} onDateChange={setDateRange} />
           <Button onClick={handleCalculateSalaries} disabled={isCalculating}>
            {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Calculate Salaries
           </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Calculated Salary Report</CardTitle>
          <CardDescription>
            Showing results for {dateRange?.from && dateRange?.to ? `${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}` : "the selected period"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Base Salary</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                  <TableHead>Deductions (-)/Additions (+)</TableHead>
                  <TableHead className="text-right font-bold">Net Payable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryData.length > 0 ? (
                  salaryData.map(data => (
                    <TableRow key={data.employeeId}>
                      <TableCell className="font-medium">{data.name} <span className="text-xs text-muted-foreground">({data.employeeId})</span></TableCell>
                      <TableCell className="text-right">{currencySymbol}{convertPrice(data.baseSalaryForPeriod).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currencySymbol}{convertPrice(data.bonusForPeriod).toFixed(2)}</TableCell>
                      <TableCell>
                        <Input 
                            type="number" 
                            step="1"
                            value={data.deductions}
                            onChange={(e) => handleDeductionChange(data.employeeId, e.target.value)}
                            className="h-8 w-28"
                            placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right font-bold">{currencySymbol}{convertPrice(data.netPay).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">No salary data calculated for this period.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={handleDownloadCsv} disabled={salaryData.length === 0}><Download className="mr-2 h-4 w-4"/> Download CSV</Button>
            <Button onClick={handleMarkAsPaid} disabled={isCalculating || salaryData.length === 0}>
              {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Mark as Paid & Record
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
