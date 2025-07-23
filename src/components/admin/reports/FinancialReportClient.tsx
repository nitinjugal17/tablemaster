
"use client";

import React, { useState, useMemo } from 'react';
import type { Order, Expense, SalaryPayment, StockItem, MenuItem as MenuItemType, OrderItem } from '@/lib/types';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, TrendingUp, DollarSign, PieChart as PieChartIcon, ShoppingCart, Users, Power, Home } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfDay, startOfDay, isWithinInterval, parseISO, isValid } from 'date-fns';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

const StatCard = ({ title, value, description, icon: Icon, trend, trendDirection }: { title: string, value: string, description: string, icon: React.ElementType, trend?: string, trendDirection?: 'up' | 'down' }) => {
    const trendColor = trendDirection === 'up' ? 'text-green-600' : 'text-red-600';
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
                {trend && <p className={`text-xs font-semibold ${trendColor}`}>{trend}</p>}
            </CardContent>
        </Card>
    );
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

interface FinancialReportClientProps {
    initialOrders: Order[];
    initialExpenses: Expense[];
    initialSalaryPayments: SalaryPayment[];
    initialStockItems: StockItem[];
    initialMenuItems: MenuItemType[];
}

export const FinancialReportClient: React.FC<FinancialReportClientProps> = ({
    initialOrders, initialExpenses, initialSalaryPayments, initialStockItems, initialMenuItems
}) => {
  const { currencySymbol, convertPrice } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });

  const processedData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null;
    const start = startOfDay(dateRange.from);
    const end = endOfDay(dateRange.to);

    const filteredOrders = initialOrders.filter(o => o.status === 'Completed' && isValid(parseISO(o.createdAt as string)) && isWithinInterval(parseISO(o.createdAt as string), { start, end }));
    const filteredExpenses = initialExpenses.filter(e => isValid(parseISO(e.date)) && isWithinInterval(parseISO(e.date), { start, end }));
    
    const filteredSalaries = initialSalaryPayments.filter(p => {
        const paymentDate = typeof p.paymentDate === 'string' ? parseISO(p.paymentDate) : p.paymentDate;
        return isValid(paymentDate) && isWithinInterval(paymentDate, { start, end });
    });


    const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);

    const itemCosts = filteredOrders.flatMap(order => {
        const orderItems: OrderItem[] = Array.isArray(order.items) ? order.items : typeof order.items === 'string' ? JSON.parse(order.items) : [];
        return orderItems.map(item => (item.currentCalculatedCost || 0) * item.quantity);
    }).reduce((sum, cost) => sum + cost, 0);
    const stockConsumption = itemCosts; // Simplified COGS

    const salaryExpenses = filteredSalaries.reduce((sum, p) => sum + p.netPay, 0);
    const propertyExpenses = filteredExpenses.filter(e => ['Rent', 'Maintenance'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);
    const electricityCharges = filteredExpenses.filter(e => e.category === 'Utilities').reduce((sum, e) => sum + e.amount, 0);
    const otherOpEx = filteredExpenses.filter(e => !['Rent', 'Maintenance', 'Utilities'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);
    
    const totalOperatingExpenses = salaryExpenses + propertyExpenses + electricityCharges + otherOpEx;
    const totalExpenses = stockConsumption + totalOperatingExpenses;
    
    const netProfit = totalSales - totalExpenses;
    const netProfitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    const foodCostPercentage = totalSales > 0 ? (stockConsumption / totalSales) * 100 : 0;
    
    const salesByCategory = filteredOrders.flatMap(o => {
      const items: OrderItem[] = Array.isArray(o.items) ? o.items : typeof o.items === 'string' ? JSON.parse(o.items) : [];
      return items;
    }).reduce((acc, item) => {
        const menuItem = initialMenuItems.find(mi => mi.id === (item as OrderItem).menuItemId);
        const category = menuItem?.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + ((item as OrderItem).price * (item as OrderItem).quantity);
        return acc;
    }, {} as Record<string, number>);

    const salesByCategoryData = Object.entries(salesByCategory).map(([name, value], index) => ({ name, value, fill: COLORS[index % COLORS.length]}));
    
    return {
      totalSales, stockConsumption, totalExpenses, netProfit, netProfitMargin, foodCostPercentage,
      salaryExpenses, propertyExpenses, electricityCharges, otherOpEx, salesByCategoryData
    };
  }, [dateRange, initialOrders, initialExpenses, initialSalaryPayments, initialMenuItems]);

  if (!processedData) {
    return (
      <div>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        <p className="mt-4">Please select a valid date range.</p>
      </div>
    );
  }

  const { totalSales, stockConsumption, totalExpenses, netProfit, netProfitMargin, foodCostPercentage, salaryExpenses, propertyExpenses, electricityCharges, otherOpEx, salesByCategoryData } = processedData;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <BarChart3 className="mr-3 h-7 w-7" /> Financial Report
          </h1>
          <p className="text-muted-foreground">Comprehensive P&L report for the selected period.</p>
        </div>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {/* Executive Dashboard */}
      <Card>
        <CardHeader><CardTitle>Executive Dashboard</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Sales" value={`${currencySymbol}${convertPrice(totalSales).toFixed(2)}`} description="Total revenue from completed orders." icon={TrendingUp} />
          <StatCard title="Total Expenses" value={`${currencySymbol}${convertPrice(totalExpenses).toFixed(2)}`} description="COGS + Operating Expenses" icon={DollarSign} />
          <StatCard title="Net Profit" value={`${currencySymbol}${convertPrice(netProfit).toFixed(2)}`} description="Sales minus all expenses" icon={DollarSign} trendDirection={netProfit >= 0 ? 'up' : 'down'} />
          <StatCard title="Net Profit Margin" value={`${netProfitMargin.toFixed(2)}%`} description="(Net Profit / Sales) * 100" icon={PieChartIcon} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Performance */}
        <div className="lg:col-span-2">
            <Card>
                <CardHeader><CardTitle>Sales Performance</CardTitle></CardHeader>
                <CardContent>
                    <h3 className="text-md font-semibold mb-2">Sales by Category</h3>
                     <ChartContainer config={{}} className="h-[300px] w-full">
                        <BarChart data={salesByCategoryData} layout="vertical">
                           <CartesianGrid strokeDasharray="3 3" />
                           <XAxis type="number" tickFormatter={(value) => `${currencySymbol}${convertPrice(Number(value) / 1000)}k`} />
                           <YAxis type="category" dataKey="name" width={80} />
                           <Tooltip content={<ChartTooltipContent formatter={(value) => `${currencySymbol}${convertPrice(Number(value)).toFixed(2)}`} />} />
                           <Bar dataKey="value" name="Sales" fill="hsl(var(--primary))" />
                        </BarChart>
                     </ChartContainer>
                </CardContent>
            </Card>
        </div>

        {/* P&L Breakdown */}
        <div className="lg:col-span-1">
            <Card>
                <CardHeader><CardTitle>Profit & Loss Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[320px]">
                    <Table>
                        <TableBody>
                            <TableRow><TableCell className="font-semibold">Total Sales</TableCell><TableCell className="text-right font-semibold">{currencySymbol}{convertPrice(totalSales).toFixed(2)}</TableCell></TableRow>
                            <TableRow><TableCell className="pl-6 text-green-600">Less: COGS (Stock)</TableCell><TableCell className="text-right text-green-600">-{currencySymbol}{convertPrice(stockConsumption).toFixed(2)}</TableCell></TableRow>
                            <TableRow className="border-t-2 border-primary/50"><TableCell className="font-semibold">Gross Profit</TableCell><TableCell className="text-right font-semibold">{currencySymbol}{convertPrice(totalSales - stockConsumption).toFixed(2)}</TableCell></TableRow>
                            
                            <TableRow><TableCell className="pl-6 text-red-600">Less: Salary Expenses</TableCell><TableCell className="text-right text-red-600">-{currencySymbol}{convertPrice(salaryExpenses).toFixed(2)}</TableCell></TableRow>
                            <TableRow><TableCell className="pl-6 text-red-600">Less: Property Expenses</TableCell><TableCell className="text-right text-red-600">-{currencySymbol}{convertPrice(propertyExpenses).toFixed(2)}</TableCell></TableRow>
                            <TableRow><TableCell className="pl-6 text-red-600">Less: Electricity Charges</TableCell><TableCell className="text-right text-red-600">-{currencySymbol}{convertPrice(electricityCharges).toFixed(2)}</TableCell></TableRow>
                            <TableRow><TableCell className="pl-6 text-red-600">Less: Other Expenses</TableCell><TableCell className="text-right text-red-600">-{currencySymbol}{convertPrice(otherOpEx).toFixed(2)}</TableCell></TableRow>

                            <TableRow className="border-t-2 border-primary/50"><TableCell className="font-bold text-lg">Net Profit</TableCell><TableCell className={`text-right font-bold text-lg ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{currencySymbol}{convertPrice(netProfit).toFixed(2)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
