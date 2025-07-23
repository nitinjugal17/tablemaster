
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Order, MenuItem as MenuItemType, Employee, Booking, RestaurantTable, Room, AttendanceRecord, StockItem, OrderItem } from '@/lib/types';
import {
  getOrders, getMenuItems, getEmployees, getBookings, getRestaurantTables, getRooms, getAttendanceRecords, getStockItems, getActiveDataSourceStatus
} from '@/app/actions/data-management-actions';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Loader2, BarChart3, TrendingUp, Users, Clock, Utensils, Percent, DollarSign, PieChart as PieChartIcon, BookOpen, Package, UserCheck, Activity, CalendarDays, AlertCircle, XCircle, CheckCircle, Info } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, eachDayOfInterval, format, parseISO, isWithinInterval, getHours, isValid } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#d0ed57", "#a4de6c", "#83a6ed"];

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const StatCardSkeleton = () => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
        </CardContent>
    </Card>
);


export default function OperationalReportPage() {
  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSourceStatus, setDataSourceStatus] = useState<{ isFallback: boolean; message: string; } | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date()),
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [o, m, e, b, a, s, dsStatus] = await Promise.all([
        getOrders(), getMenuItems(), getEmployees(), getBookings(), getAttendanceRecords(), getStockItems(), getActiveDataSourceStatus()
      ]);
      setOrders(o);
      setMenuItems(m);
      setEmployees(e);
      setBookings(b);
      setAttendance(a);
      setStockItems(s);
      setDataSourceStatus(dsStatus);
    } catch (error) {
      toast({ title: "Error", description: "Could not load necessary data for reports.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const filteredData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return { orders: [], bookings: [], attendance: [] };
    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);

    const filteredOrders = orders.filter(o => {
        try {
            const orderDate = typeof o.createdAt === 'string' ? parseISO(o.createdAt) : o.createdAt;
            if (!isValid(orderDate)) return false;
            return isWithinInterval(orderDate, { start, end }) && o.status === 'Completed';
        } catch { return false; }
    });
    const filteredBookings = bookings.filter(b => {
        try { return isWithinInterval(parseISO(b.date), { start, end }) && b.status === 'confirmed'; } catch { return false; }
    });
    const filteredAttendance = attendance.filter(a => {
        try { return isWithinInterval(parseISO(a.date), { start, end }); } catch { return false; }
    });

    return { orders: filteredOrders, bookings: filteredBookings, attendance: filteredAttendance };
  }, [orders, bookings, attendance, dateRange]);


  const menuReportData = useMemo(() => {
    const itemStats: Record<string, { count: number; revenue: number }> = {};
    filteredData.orders.forEach(order => {
      const orderItems: OrderItem[] = Array.isArray(order.items)
        ? order.items
        : typeof order.items === 'string'
        ? JSON.parse(order.items)
        : [];
      orderItems.forEach(item => {
        if (!itemStats[item.name]) {
          itemStats[item.name] = { count: 0, revenue: 0 };
        }
        itemStats[item.name].count += item.quantity;
        itemStats[item.name].revenue += item.price * item.quantity;
      });
    });
    const sortedByCount = Object.entries(itemStats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count).slice(0, 10);
    const sortedByRevenue = Object.entries(itemStats).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    return { byCount: sortedByCount, byRevenue: sortedByRevenue };
  }, [filteredData.orders]);

  const bookingReportData = useMemo(() => {
    const dailyBookings: Record<string, { count: number, guests: number }> = {};
    if(!dateRange?.from || !dateRange?.to) return [];
    
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    days.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        dailyBookings[dayStr] = { count: 0, guests: 0 };
    });

    filteredData.bookings.forEach(booking => {
        try {
            const dayStr = format(parseISO(booking.date), 'yyyy-MM-dd');
            if (dailyBookings[dayStr]) {
                dailyBookings[dayStr].count++;
                dailyBookings[dayStr].guests += booking.partySize;
            }
        } catch {}
    });

    return Object.entries(dailyBookings).map(([date, data]) => ({ date: format(parseISO(date), 'MMM d'), ...data }));
  }, [filteredData.bookings, dateRange]);

  const attendanceReportData = useMemo(() => {
    const presentCount = filteredData.attendance.filter(a => a.status === 'Present').length;
    const lateCount = filteredData.attendance.filter(a => a.status === 'Late').length;
    const onLeaveCount = filteredData.attendance.filter(a => a.status === 'On Leave').length;
    return { presentCount, lateCount, onLeaveCount, totalRecords: filteredData.attendance.length };
  }, [filteredData.attendance]);

  const stockReportData = useMemo(() => {
    const lowStock = stockItems.filter(item => item.currentStock <= item.reorderLevel);
    const outOfStock = lowStock.filter(item => item.currentStock === 0);
    return {
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStockItems: lowStock.sort((a, b) => (a.reorderLevel > 0 ? a.currentStock / a.reorderLevel : Infinity) - (b.reorderLevel > 0 ? b.currentStock / b.reorderLevel : Infinity)).slice(0,10)
    };
  }, [stockItems]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <Activity className="mr-3 h-7 w-7" /> Operational Report
          </h1>
          <p className="text-muted-foreground">Detailed analytics across key operational areas.</p>
        </div>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {dataSourceStatus?.isFallback && (
        <Alert variant="default" className="bg-amber-50 border-amber-400">
          <Info className="h-5 w-5 text-amber-600" />
          <AlertTitle className="font-semibold text-amber-700">Database Unreachable</AlertTitle>
          <AlertDescription className="text-amber-600">
            {dataSourceStatus.message} Displaying data from local CSV files as a fallback.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* Menu Item Reports */}
        <Card>
          <CardHeader><CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5 text-accent"/>Menu Item Analytics</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Top 10 by Units Sold</h4>
              {isLoading ? <Skeleton className="h-[200px] w-full" /> : 
              <ChartContainer config={{ count: { label: "Units" } }} className="h-[200px] w-full">
                  <BarChart data={menuReportData.byCount} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} fontSize={10} />
                      <XAxis type="number" hide />
                      <Tooltip cursor={false} content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count, hsl(var(--primary)))" radius={4} />
                  </BarChart>
              </ChartContainer>
              }
            </div>
             <div>
              <h4 className="font-semibold text-sm mb-2">Top 10 by Revenue</h4>
               {isLoading ? <Skeleton className="h-[200px] w-full" /> : 
              <ChartContainer config={{ revenue: { label: "Revenue" } }} className="h-[200px] w-full">
                  <BarChart data={menuReportData.byRevenue} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} fontSize={10}/>
                      <XAxis type="number" hide />
                      <Tooltip cursor={false} content={<ChartTooltipContent formatter={(value) => `${currencySymbol}${convertPrice(Number(value)).toFixed(2)}`} />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue, hsl(var(--accent)))" radius={4} />
                  </BarChart>
              </ChartContainer>
              }
            </div>
          </CardContent>
        </Card>

        {/* Booking Reports */}
        <Card>
          <CardHeader><CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-accent"/>Booking Insights</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[450px] w-full" /> :
            <ChartContainer config={{ count: { label: "Bookings", color: "hsl(var(--primary))" }, guests: { label: "Guests", color: "hsl(var(--accent))" } }} className="h-[450px] w-full">
              <BarChart data={bookingReportData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={10}/>
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                <Bar dataKey="guests" fill="var(--color-guests)" radius={4} />
              </BarChart>
            </ChartContainer>
            }
          </CardContent>
        </Card>

        {/* Inventory Reports */}
        <Card>
          <CardHeader><CardTitle className="flex items-center"><Package className="mr-2 h-5 w-5 text-accent"/>Inventory Status</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {isLoading ? <><StatCardSkeleton /><StatCardSkeleton /></> :
              <>
                <StatCard title="Low Stock Items" value={String(stockReportData.lowStockCount)} icon={AlertCircle} />
                <StatCard title="Out of Stock Items" value={String(stockReportData.outOfStockCount)} icon={XCircle} />
              </>
              }
            </div>
             <h4 className="font-semibold text-sm mb-2">Top 10 Lowest Stock Items (by % of Reorder Level)</h4>
             {isLoading ? <Skeleton className="h-64 w-full" /> : 
             <ScrollArea className="h-64">
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Stock</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stockReportData.lowStockItems.map(item => (
                    <TableRow key={item.id} className="bg-red-50 dark:bg-red-900/20">
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.currentStock} / {item.reorderLevel} {item.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
             </ScrollArea>
            }
          </CardContent>
        </Card>

        {/* HR Reports */}
        <Card>
          <CardHeader><CardTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5 text-accent"/>Employee Attendance</CardTitle></CardHeader>
          <CardContent>
             <div className="grid grid-cols-3 gap-4 mb-4">
              {isLoading ? <><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></> : <>
                <StatCard title="Total Present" value={String(attendanceReportData.presentCount)} icon={CheckCircle} />
                <StatCard title="Total Late" value={String(attendanceReportData.lateCount)} icon={Clock} />
                <StatCard title="On Leave" value={String(attendanceReportData.onLeaveCount)} icon={Users} />
              </>
              }
            </div>
            <p className="text-sm text-center text-muted-foreground">Based on {isLoading ? '...' : attendanceReportData.totalRecords} record(s) in the selected period.</p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
