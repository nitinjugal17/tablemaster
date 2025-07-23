
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { getSalaryPayments, getEmployees } from '@/app/actions/data-management-actions';
import { Loader2, DollarSign, CalendarDays, User, Filter, RotateCcw } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrency } from '@/hooks/useCurrency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SalaryPayment, Employee } from '@/lib/types';
import { cn } from "@/lib/utils";

export default function SalaryHistoryPage() {
  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();
  
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedPayments, fetchedEmployees] = await Promise.all([
        getSalaryPayments(),
        getEmployees(),
      ]);
      setPayments(fetchedPayments.sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()));
      setEmployees(fetchedEmployees);
    } catch (error) {
      toast({ title: "Error", description: "Could not load salary history data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const paymentDates = useMemo(() => {
    return payments.map(p => {
        try {
            return typeof p.paymentDate === 'string' ? parseISO(p.paymentDate) : new Date(p.paymentDate);
        } catch {
            return new Date(0); // Invalid date
        }
    }).filter(d => d.getTime() !== 0);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const paymentDateObject = typeof p.paymentDate === 'string' ? parseISO(p.paymentDate) : new Date(p.paymentDate);
      const matchesDate = !selectedDate || isSameDay(paymentDateObject, selectedDate);
      const matchesEmployee = selectedEmployee === 'all' || p.employeeId === selectedEmployee;
      return matchesDate && matchesEmployee;
    });
  }, [payments, selectedDate, selectedEmployee]);

  const resetFilters = () => {
    setSelectedDate(undefined);
    setSelectedEmployee('all');
  };

  const modifiers = {
    paymentDay: paymentDates,
  };
  const modifiersStyles = {
    paymentDay: {
      color: 'hsl(var(--primary-foreground))',
      backgroundColor: 'hsl(var(--primary))',
      borderRadius: '50%',
    },
  };
  
  const formatDateSafe = (dateInput: string | Date, formatString: string) => {
    try {
        const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
        return format(date, formatString);
    } catch (e) {
        return 'Invalid Date';
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <DollarSign className="mr-3 h-7 w-7" /> Salary Payment History
        </h1>
        <p className="text-muted-foreground">Review past salary payments made to employees.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-lg">Filter Payments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="employeeFilter">Filter by Employee</Label>
                        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                            <SelectTrigger id="employeeFilter">
                                <SelectValue placeholder="Select Employee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                {employees.map(emp => (
                                    <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label>Filter by Payment Date</Label>
                         <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            modifiers={modifiers}
                            modifiersStyles={modifiersStyles}
                            className="rounded-md border"
                        />
                    </div>
                    <Button onClick={resetFilters} variant="outline" className="w-full">
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset Filters
                    </Button>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Payment Records</CardTitle>
                    <CardDescription>
                        Showing {filteredPayments.length} of {payments.length} total recorded payments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(100vh-20rem)]">
                        {isLoading ? (
                             <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                        ) : filteredPayments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paid On</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead className="text-right">Net Pay</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPayments.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="text-xs">{formatDateSafe(p.paymentDate, 'MMM d, yyyy')}</TableCell>
                                        <TableCell className="font-medium">{p.employeeName}</TableCell>
                                        <TableCell className="text-xs">{formatDateSafe(p.periodFrom, 'dd/MM/yy')} - {formatDateSafe(p.periodTo, 'dd/MM/yy')}</TableCell>
                                        <TableCell className="text-right font-semibold">{currencySymbol}{convertPrice(p.netPay).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         ) : (
                            <div className="text-center py-20 text-muted-foreground">
                                <p>No payments match the current filters.</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
  );
}


