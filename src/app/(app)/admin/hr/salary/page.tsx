
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Employee, Order, InvoiceSetupSettings, AttendanceRecord, SalaryPayment } from '@/lib/types';
import { BASE_CURRENCY_CODE } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { getEmployees, getOrders, getGeneralSettings, getAttendanceRecords, saveSalaryPayments } from '@/app/actions/data-management-actions';
import { Loader2, DollarSign, Download, AlertTriangle, FileArchive } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format, isWithinInterval, eachDayOfInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrency } from '@/hooks/useCurrency';
import Papa from 'papaparse';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DateRange } from 'react-day-picker';

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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<InvoiceSetupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });

  const [salaryData, setSalaryData] = useState<SalaryData[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (isLoadingAuth) return;
      if (user?.role !== 'superadmin') {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [emps, ords, stgs, atts] = await Promise.all([
          getEmployees(), 
          getOrders(), 
          getGeneralSettings(),
          getAttendanceRecords(),
        ]);
        setEmployees(emps);
        setOrders(ords);
        setSettings(stgs);
        setAttendanceRecords(atts);
      } catch (error) {
        toast({ title: "Error", description: "Could not load required data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast, user, isLoadingAuth]);

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
    if (!dateRange || !dateRange.from || !dateRange.to || !settings || employees.length === 0) {
      toast({ title: "Prerequisites Missing", description: "A full date range, settings, and employee data are required.", variant: "destructive" });
      return;
    }

    setIsCalculating(true);
    const newSalaryData: SalaryData[] = [];
    const intervalDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const employeeCount = employees.length > 0 ? employees.length : 1;

    // Pre-calculate daily bonus
    const dailyBonusMap = new Map<string, number>();
    for (const day of intervalDays) {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const todaysRevenue = orders
        .filter(o => o.status === 'Completed' && isWithinInterval(parseISO(o.createdAt), { start: dayStart, end: dayEnd }))
        .reduce((sum, o) => sum + o.total, 0);

      const threshold = settings.dailyRevenueThreshold || 0;
      const bonusPercentage = settings.bonusPercentageAboveThreshold || 0;
      const maxBonusPool = settings.employeeBonusAmount || 0;
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
    for (const employee of employees) {
      let baseSalaryForPeriod = 0;
      let bonusForPeriod = 0;

      const employeeAttendanceInRange = attendanceRecords.filter(
        (att) =>
          att.employeeId === employee.employeeId &&
          isWithinInterval(parseISO(att.date), { start: dateRange.from!, end: dateRange.to! })
      );
      
      const presentDays = employeeAttendanceInRange.filter(att => att.status === 'Present' || att.status === 'Late').length;

      if (employee.baseSalary && employee.salaryCalculationType) {
        if (employee.salaryCalculationType === 'monthly') {
          // Simplistic monthly calculation: (salary / 30) * days present
          baseSalaryForPeriod = (employee.baseSalary / 30) * presentDays;
        } else { // daily
          baseSalaryForPeriod = employee.baseSalary * presentDays;
        }
      }

      for (const day of intervalDays) {
          const dayString = format(day, 'yyyy-MM-dd');
          const wasPresent = employeeAttendanceInRange.some(att => att.date === dayString && (att.status === 'Present' || att.status === 'Late'));
          if (wasPresent) {
            bonusForPeriod += dailyBonusMap.get(day.toISOString().split('T')[0]) || 0;
          }
      }

      newSalaryData.push({
        employeeId: employee.employeeId,
        name: employee.name,
        baseSalaryForPeriod,
        bonusForPeriod,
        deductions: 0,
        netPay: baseSalaryForPeriod + bonusForPeriod,
      });
    }

    setSalaryData(newSalaryData);
    setIsCalculating(false);
    toast({ title: "Salaries Calculated", description: `Calculated for ${intervalDays.length} days based on attendance.` });
  }, [dateRange, settings, employees, orders, attendanceRecords, toast]);

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
        description: `Successfully recorded ${paymentsToSave.length} salary payments.`
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
       <p className="text-muted-foreground -mt-4">Calculate employee salaries including bonuses for a given period, based on attendance.</p>
      
      <Alert variant="default" className="bg-sky-50 border-sky-300">
        <AlertTriangle className="h-5 w-5 text-sky-600" />
        <AlertTitle className="font-semibold text-sky-700">Salary Calculation Note</AlertTitle>
        <AlertDescription className="text-sky-600">
          Salary calculations now depend on employee attendance records. 'Present' and 'Late' are considered paid days.
          Clicking "Mark as Paid" saves the calculated salaries to a permanent history log.
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
              {isCalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Mark as Paid & Record
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
