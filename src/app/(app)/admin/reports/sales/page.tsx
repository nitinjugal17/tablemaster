
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Order, MenuItem as MenuItemType, Employee, Booking, RestaurantTable } from '@/lib/types';
import {
  getOrders, getMenuItems, getEmployees, getBookings, getRestaurantTables
} from '@/app/actions/data-management-actions';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { Loader2, BarChart3, TrendingUp, Users, Clock, Utensils, Percent, DollarSign, PieChart as PieChartIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, startOfDay, endOfDay, subDays, eachDayOfInterval, format, parseISO, differenceInMinutes, getHours, isWithinInterval } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const StatCard = ({ title, value, description, icon: Icon }: { title: string, value: string, description: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
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
            <Skeleton className="h-3 w-32" />
        </CardContent>
    </Card>
);


export default function SalesReportPage() {
  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [o, m, e, b, t] = await Promise.all([
          getOrders(), getMenuItems(), getEmployees(), getBookings(), getRestaurantTables()
        ]);
        setOrders(o);
        setMenuItems(m);
        setEmployees(e);
        setBookings(b);
        setTables(t);
      } catch (error) {
        toast({ title: "Error", description: "Could not load necessary data for reports.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);
  
  const filteredData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return { orders: [], bookings: [] };
    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);

    const filteredOrders = orders.filter(o => {
        try { return isWithinInterval(parseISO(o.createdAt), { start, end }) && o.status === 'Completed'; } catch { return false; }
    });

    const filteredBookings = bookings.filter(b => {
        try { return isWithinInterval(parseISO(b.date), { start, end }) && b.status === 'confirmed'; } catch { return false; }
    });

    return { orders: filteredOrders, bookings: filteredBookings };
  }, [orders, bookings, dateRange]);


  const stats = useMemo(() => {
    const { orders: currentOrders, bookings: currentBookings } = filteredData;
    if (currentOrders.length === 0 && !isLoading) return { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, revenuePerEmployee: 0, tableTurnoverRate: 0, avgCompletionTime: 0 };
    
    const totalRevenue = currentOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = currentOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Revenue per employee (simplified)
    const revenuePerEmployee = employees.length > 0 ? totalRevenue / employees.length : 0;
    
    // Table Turnover
    const dineInOrders = currentOrders.filter(o => o.orderType === 'Dine-in' && o.tableNumber);
    const tableTurnoverRate = tables.length > 0 ? dineInOrders.length / tables.length : 0;

    // Average Order Completion Time (for takeaway)
    const takeawayOrders = currentOrders.filter(o => o.orderType === 'Takeaway');
    const totalCompletionTime = takeawayOrders.reduce((sum, o) => {
        // This is a placeholder as we don't have ready time. Using a mock 20 mins.
        return sum + 20; 
    }, 0);
    const avgCompletionTime = takeawayOrders.length > 0 ? totalCompletionTime / takeawayOrders.length : 0;

    return { totalRevenue, totalOrders, avgOrderValue, revenuePerEmployee, tableTurnoverRate, avgCompletionTime };
  }, [filteredData, employees, tables, isLoading]);


  const salesOverTime = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map(day => {
      const dayStr = format(day, 'MMM d');
      const dailyRevenue = filteredData.orders
        .filter(o => format(parseISO(o.createdAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
        .reduce((sum, o) => sum + o.total, 0);
      return { name: dayStr, Sales: convertPrice(dailyRevenue) };
    });
  }, [filteredData, dateRange, convertPrice]);
  
  const peakHours = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, Orders: 0 }));
    filteredData.orders.forEach(o => {
        const hour = getHours(parseISO(o.createdAt));
        hours[hour].Orders++;
    });
    return hours.filter(h => h.Orders > 0);
  }, [filteredData.orders]);

  const popularItems = useMemo(() => {
    const itemCounts: { [key: string]: { name: string; count: number } } = {};
    filteredData.orders.forEach(o => {
        o.items.forEach(item => {
            if (!itemCounts[item.menuItemId]) {
                itemCounts[item.menuItemId] = { name: item.name, count: 0 };
            }
            itemCounts[item.menuItemId].count += item.quantity;
        });
    });
    return Object.values(itemCounts).sort((a,b) => b.count - a.count).slice(0, 10);
  }, [filteredData.orders]);
  
  const orderTypeData = useMemo(() => {
      const dineIn = filteredData.orders.filter(o => o.orderType === 'Dine-in').length;
      const takeaway = filteredData.orders.filter(o => o.orderType === 'Takeaway').length;
      return [{name: 'Dine-in', value: dineIn, fill: '#0088FE'}, {name: 'Takeaway', value: takeaway, fill: '#00C49F'}];
  }, [filteredData.orders]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <BarChart3 className="mr-3 h-7 w-7" /> Sales & Analytics Report
          </h1>
          <p className="text-muted-foreground">Analyze sales data and view key performance metrics.</p>
        </div>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard title="Total Revenue" value={`${currencySymbol}${convertPrice(stats?.totalRevenue || 0).toFixed(2)}`} description={`${stats?.totalOrders || 0} completed orders`} icon={TrendingUp} />
            <StatCard title="Average Order Value" value={`${currencySymbol}${convertPrice(stats?.avgOrderValue || 0).toFixed(2)}`} description="Mean value of all completed orders" icon={DollarSign} />
            <StatCard title="Table Turnover Rate" value={`${(stats?.tableTurnoverRate || 0).toFixed(2)}`} description="Parties served per table" icon={Users} />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         {isLoading ? (
          <>
            <Card><CardHeader><CardTitle>Sales Over Time</CardTitle></CardHeader><CardContent className="h-[250px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></CardContent></Card>
            <Card><CardHeader><CardTitle>Peak Hours</CardTitle><CardDescription>Orders placed per hour of the day.</CardDescription></CardHeader><CardContent className="h-[250px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></CardContent></Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>Sales Over Time</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{ Sales: { label: "Sales", color: "hsl(var(--primary))" } }} className="h-[250px] w-full">
                  <LineChart data={salesOverTime}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent indicator="line" />} />
                    <Line dataKey="Sales" type="monotone" stroke="var(--color-Sales)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Peak Hours</CardTitle><CardDescription>Orders placed per hour of the day.</CardDescription></CardHeader>
              <CardContent>
                 <ChartContainer config={{ Orders: { label: "Orders", color: "hsl(var(--accent))" } }} className="h-[250px] w-full">
                    <BarChart data={peakHours}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis />
                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <Bar dataKey="Orders" fill="var(--color-Orders)" radius={4} />
                    </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr_2fr]">
         {isLoading ? (
          <>
            <Card><CardHeader><CardTitle>Order Types</CardTitle></CardHeader><CardContent className="h-[200px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></CardContent></Card>
            <Card><CardHeader><CardTitle>Top 10 Popular Items</CardTitle><CardDescription>Most frequently ordered items in the period.</CardDescription></CardHeader><CardContent className="h-[200px] w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/></CardContent></Card>
          </>
        ) : (
          <>
            <Card>
                <CardHeader><CardTitle>Order Types</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-[200px] w-full">
                      <PieChart>
                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={orderTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={5}>
                           {orderTypeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                        </Pie>
                        <Legend />
                      </PieChart>
                  </ChartContainer>
                </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top 10 Popular Items</CardTitle><CardDescription>Most frequently ordered items in the period.</CardDescription></CardHeader>
              <CardContent>
                <ChartContainer config={{ count: { label: "Units Sold" } }} className="h-[200px] w-full">
                    <BarChart data={popularItems} layout="vertical">
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={120} />
                        <XAxis type="number" hide />
                        <Tooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-count, hsl(var(--primary)))" radius={4} />
                    </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
