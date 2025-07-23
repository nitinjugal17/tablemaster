
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { Order, Employee, Booking, RestaurantTable, Outlet, OrderItem } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, Utensils, DollarSign, PieChart as PieChartIcon, Info } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfDay, startOfDay, eachDayOfInterval, format, parseISO, isWithinInterval, getHours, isValid } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


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

interface SalesReportClientProps {
    initialOrders: Order[];
    initialEmployees: Employee[];
    initialBookings: Booking[];
    initialTables: RestaurantTable[];
    initialOutlets: Outlet[];
}

export const SalesReportClient: React.FC<SalesReportClientProps> = ({
    initialOrders,
    initialEmployees,
    initialBookings,
    initialTables,
    initialOutlets,
}) => {
  const { currencySymbol, convertPrice } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  
  // This memo handles all client-side filtering based on the date and outlet selection.
  const filteredData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return { orders: [], bookings: [] };
    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);

    const filteredOrders = initialOrders.filter(o => {
        try {
            const orderDate = typeof o.createdAt === 'string' ? parseISO(o.createdAt) : o.createdAt;
            if (!isValid(orderDate)) return false;
            
            const dateMatch = isWithinInterval(orderDate, { start, end });
            const statusMatch = o.status === 'Completed';
            const outletMatch = !selectedOutletId || selectedOutletId === 'all' || o.outletId === selectedOutletId;
            return dateMatch && statusMatch && outletMatch;
        } catch { return false; }
    });
    
    const filteredBookings = initialBookings.filter(b => {
        try { 
            const bookingDate = typeof b.date === 'string' ? parseISO(b.date) : b.date;
            if(!isValid(bookingDate)) return false;
            return isWithinInterval(bookingDate, { start, end }) && b.status === 'confirmed'; 
        } catch { return false; }
    });

    return { orders: filteredOrders, bookings: filteredBookings };
  }, [dateRange, selectedOutletId, initialOrders, initialBookings]);

  // This memo calculates all stats based on the filtered data.
  const processedStats = useMemo(() => {
    const { orders: filteredOrders, bookings: filteredBookings } = filteredData;
    
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
    const totalGuestsFromOrders = filteredOrders.reduce((sum, order) => sum + (order.items?.length || 1), 0);
    const totalGuestsFromBookings = filteredBookings.reduce((sum, booking) => sum + booking.partySize, 0);
    const totalGuests = totalGuestsFromOrders + totalGuestsFromBookings;
    const tableTurnoverRate = initialTables.length > 0 ? totalGuests / initialTables.length : 0;

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, Orders: 0 }));
    filteredOrders.forEach(order => {
        try { 
            const orderDate = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt;
            if(!isValid(orderDate)) return;
            const hour = getHours(orderDate); 
            hourlyData[hour].Orders++; 
        } catch {}
    });

    const itemCounts: Record<string, number> = {};
    filteredOrders.forEach(order => {
      const orderItems: OrderItem[] = Array.isArray(order.items) 
        ? order.items 
        : typeof order.items === 'string' 
        ? JSON.parse(order.items) 
        : [];
      orderItems.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const orderTypes = filteredOrders.reduce((acc, order) => {
        const orderType = order.orderType || 'Unknown';
        acc[orderType] = (acc[orderType] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const orderTypeData = Object.entries(orderTypes).map(([name, value], index) => ({
      name,
      value,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));
    
    const salesOverTimeData = (dateRange?.from && dateRange?.to) ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => {
        const dayStr = format(day, 'MMM d');
        const dailyRevenue = filteredOrders
          .filter(o => {
            try {
              const orderDate = typeof o.createdAt === 'string' ? parseISO(o.createdAt) : o.createdAt;
              return isValid(orderDate) && format(orderDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
            } catch { return false; }
          })
          .reduce((sum, o) => sum + o.total, 0);
        return { name: dayStr, Sales: convertPrice(dailyRevenue) };
    }) : [];
    
    return {
        stats: { totalRevenue, totalOrders, avgOrderValue, tableTurnoverRate },
        peakHours: hourlyData.filter(h => h.Orders > 0),
        popularItems,
        orderTypeData,
        salesOverTimeData,
    };
  }, [filteredData, initialTables, dateRange, convertPrice]);
  
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const { stats, peakHours, popularItems, orderTypeData, salesOverTimeData } = processedStats;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <BarChart3 className="mr-3 h-7 w-7" /> Sales & Analytics Report
          </h1>
          <p className="text-muted-foreground">Analyze sales data and view key performance metrics.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select Outlet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {initialOutlets.map(outlet => (
                <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? Array.from({length: 3}).map((_, i) => <StatCardSkeleton key={i}/>) : (
          <>
            <StatCard title="Total Revenue" value={`${currencySymbol}${convertPrice(stats.totalRevenue).toFixed(2)}`} description={`${stats.totalOrders} completed orders`} icon={TrendingUp} />
            <StatCard title="Average Order Value" value={`${currencySymbol}${convertPrice(stats.avgOrderValue).toFixed(2)}`} description="Mean value of all completed orders" icon={DollarSign} />
            <StatCard title="Table Turnover Rate" value={`${stats.tableTurnoverRate.toFixed(2)}`} description="Parties served per table" icon={Users} />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sales Over Time</CardTitle></CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ChartContainer config={{ Sales: { label: "Sales", color: "hsl(var(--primary))" } }} className="h-[250px] w-full">
                <LineChart data={salesOverTimeData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickFormatter={(value) => `${currencySymbol}${value}`} />
                  <Tooltip content={<ChartTooltipContent indicator="line" formatter={(value) => `${currencySymbol}${Number(value).toLocaleString()}`} />} />
                  <Line dataKey="Sales" type="monotone" stroke="var(--color-Sales)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
             )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Peak Hours</CardTitle><CardDescription>Orders placed per hour of the day.</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ChartContainer config={{ Orders: { label: "Orders", color: "hsl(var(--accent))" } }} className="h-[250px] w-full">
                <BarChart data={peakHours}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false}/>
                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="Orders" fill="var(--color-Orders)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[1fr_2fr]">
        <Card>
            <CardHeader><CardTitle>Order Types</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                <ChartContainer config={{}} className="h-[200px] w-full">
                    <PieChart>
                      <Tooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie data={orderTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={5}>
                          {orderTypeData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                      </Pie>
                      <Legend />
                    </PieChart>
                </ChartContainer>
              )}
            </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top 10 Popular Items</CardTitle><CardDescription>Most frequently ordered items in the period.</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <ChartContainer config={{ count: { label: "Units Sold" } }} className="h-[200px] w-full">
                  <BarChart data={popularItems} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={120} />
                      <XAxis type="number" hide />
                      <Tooltip cursor={false} content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count, hsl(var(--primary)))" radius={4} />
                  </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
