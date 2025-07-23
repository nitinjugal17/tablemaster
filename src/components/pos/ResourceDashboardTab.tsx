
"use client";

import React, { useMemo, useState } from 'react';
import type { RestaurantTable, Room, Order, Booking } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BedDouble, Columns3, DollarSign, User, Hash, History, CalendarDays } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { format, isSameDay, parseISO, isValid, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

type ResourceActivity = { type: 'order' | 'booking', id: string, customer: string, total?: number, status: string, time: string, isCurrent: boolean, date: Date };

interface ResourceDashboardTabProps {
  tables: RestaurantTable[];
  rooms: Room[];
  orders: Order[];
  bookings: Booking[];
  recentOrderIds: string[];
}

export const ResourceDashboardTab: React.FC<ResourceDashboardTabProps> = ({ tables, rooms, orders, bookings, recentOrderIds }) => {
    const { currencySymbol, convertPrice } = useCurrency();
    const [viewingResource, setViewingResource] = useState<{ name: string; activities: ResourceActivity[] } | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    });

    const { tableActivityMap, roomActivityMap } = useMemo(() => {
        const tableMap = new Map<string, ResourceActivity[]>();
        const roomMap = new Map<string, ResourceActivity[]>();

        if (!dateRange?.from || !dateRange.to) {
          return { tableActivityMap: tableMap, roomActivityMap: roomMap };
        }

        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to);

        orders.forEach(order => {
            if (!order.createdAt) return;
            
            const orderDate = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt;
            if (!isValid(orderDate) || !isWithinInterval(orderDate, { start, end })) return;

            const activity: ResourceActivity = {
                type: 'order',
                id: order.id,
                customer: order.customerName,
                total: order.total,
                status: order.status,
                time: format(orderDate, "h:mm a"),
                date: orderDate,
                isCurrent: order.status !== 'Completed' && order.status !== 'Cancelled' && isSameDay(orderDate, new Date()),
            };

            const table = tables.find(t => t.name === order.tableNumber || t.id === order.tableNumber);
            if (table) {
                if (!tableMap.has(table.id)) tableMap.set(table.id, []);
                tableMap.get(table.id)!.push(activity);
            }
        });

        bookings.forEach(booking => {
             if (!booking.date || !isValid(parseISO(booking.date)) || !isWithinInterval(parseISO(booking.date), { start, end })) return;

             if (booking.status === 'confirmed' && booking.assignedResourceId) {
                const bookingDate = parseISO(booking.date);
                const activity: ResourceActivity = {
                    type: 'booking',
                    id: booking.id,
                    customer: booking.customerName,
                    status: booking.status,
                    time: booking.time,
                    date: bookingDate,
                    isCurrent: isSameDay(bookingDate, new Date()),
                };
                if (booking.bookingType === 'table') {
                    if (!tableMap.has(booking.assignedResourceId)) tableMap.set(booking.assignedResourceId, []);
                    tableMap.get(booking.assignedResourceId)!.push(activity);
                } else if (booking.bookingType === 'room') {
                    if (!roomMap.has(booking.assignedResourceId)) roomMap.set(booking.assignedResourceId, []);
                    roomMap.get(booking.assignedResourceId)!.push(activity);
                }
            }
        });

        tableMap.forEach(activities => activities.sort((a,b) => a.date.getTime() - b.date.getTime() || a.time.localeCompare(b.time)));
        roomMap.forEach(activities => activities.sort((a,b) => a.date.getTime() - b.date.getTime() || a.time.localeCompare(b.time)));

        return { tableActivityMap: tableMap, roomActivityMap: roomMap };
    }, [orders, bookings, tables, rooms, dateRange]);
    
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'pending':
            case 'Pending':
            case 'Preparing': return 'secondary';
            case 'confirmed':
            case 'Ready for Pickup':
            case 'Out for Delivery': return 'default';
            case 'Completed': return 'outline';
            case 'cancelled':
            case 'Cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <Dialog open={!!viewingResource} onOpenChange={() => setViewingResource(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Activity for {viewingResource?.name} ({dateRange?.from && format(dateRange.from, 'd MMM')} - {dateRange?.to && format(dateRange.to, 'd MMM')})</DialogTitle>
                        <DialogDescription>Showing all orders and bookings for the selected date range.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-3 p-1 pr-3">
                       {viewingResource?.activities.map(activity => (
                           <div key={activity.id} className="p-3 border rounded-md bg-muted/50">
                               <div className="flex justify-between items-center">
                                   <p className="font-semibold">{activity.customer}</p>
                                   <Badge variant={getStatusBadgeVariant(activity.status)} className="capitalize">{activity.status}</Badge>
                               </div>
                               <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                   <p><strong>Date:</strong> {format(activity.date, 'MMM d')} @ {activity.time}</p>
                                   <p><strong>Type:</strong> <span className="capitalize">{activity.type}</span></p>
                                   <p><strong>ID:</strong> #{String(activity.id).substring(0,8)}</p>
                                   {activity.total !== undefined && <p><strong>Total:</strong> {currencySymbol}{convertPrice(activity.total).toFixed(2)}</p>}
                               </div>
                           </div>
                       ))}
                       {viewingResource?.activities.length === 0 && <p className="text-center text-muted-foreground p-4">No activity for this resource in the selected date range.</p>}
                    </div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="flex justify-end">
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Columns3 className="mr-2"/>Table Status</CardTitle>
                    <CardDescription>At-a-glance view of your restaurant floor for the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {tables.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(table => {
                            const activities = tableActivityMap.get(table.id) || [];
                            const currentActivity = activities.find(a => a.isCurrent);
                            const hasAnyActivity = activities.length > 0;
                            const status = currentActivity ? 'Occupied' : (hasAnyActivity ? 'Used' : 'Available');
                            const isRecent = currentActivity?.type === 'order' && recentOrderIds.includes(currentActivity.id);
                            
                            const statusColor = isRecent ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700' :
                                                status === 'Available' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' : 
                                                status === 'Occupied' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700' :
                                                status === 'Used' ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700' :
                                                'bg-gray-100 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600';
                            return (
                                <div key={table.id} className={cn("p-3 rounded-lg border flex flex-col justify-between min-h-[140px]", statusColor)}>
                                    <div className="text-center">
                                        <p className="font-bold text-lg">{table.name}</p>
                                        <p className="text-xs font-semibold">{status}</p>
                                    </div>
                                    <div className="text-left text-xs mt-2 pt-1 border-t border-current/30 space-y-0.5">
                                      {currentActivity ? (
                                        <>
                                            <p className="flex items-center gap-1 truncate"><Hash className="h-3 w-3 shrink-0"/> {String(currentActivity.id).substring(0,8)}</p>
                                            <p className="flex items-center gap-1 truncate"><User className="h-3 w-3 shrink-0"/> {currentActivity.customer}</p>
                                            {currentActivity.total !== undefined && (
                                                <p className="flex items-center gap-1 font-semibold"><DollarSign className="h-3 w-3 shrink-0"/> {currencySymbol}{convertPrice(currentActivity.total).toFixed(2)}</p>
                                            )}
                                        </>
                                      ) : (
                                        <div className="flex items-center justify-center h-full text-current/70">
                                            <p>Capacity: {table.capacity}</p>
                                        </div>
                                      )}
                                    </div>
                                    {activities.length > 0 && 
                                        <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => setViewingResource({ name: table.name, activities })}>
                                            <History className="h-3 w-3 mr-1"/>{activities.length} Activit{activities.length > 1 ? 'ies' : 'y'}
                                        </Button>
                                    }
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><BedDouble className="mr-2"/>Room Status</CardTitle>
                    <CardDescription>Live status of all bookable rooms for the selected period.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                         {rooms.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(room => {
                            const activities = roomActivityMap.get(room.id) || [];
                            const hasAnyActivity = activities.length > 0;
                            const status = hasAnyActivity ? 'Occupied' : 'Available';
                            const statusColor = status === 'Available' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700';
                            return (
                                <div key={room.id} className={`p-3 rounded-lg border flex flex-col justify-between min-h-[100px] ${statusColor}`}>
                                     <div className="text-center">
                                        <p className="font-bold">{room.name}</p>
                                        <p className="text-xs font-semibold">{status}</p>
                                     </div>
                                      {hasAnyActivity && (
                                        <div className="text-left text-xs mt-2 pt-1 border-t border-current/30 space-y-0.5">
                                            <p className="flex items-center gap-1 truncate"><CalendarDays className="h-3 w-3 shrink-0"/>{activities.length} Booking(s)</p>
                                        </div>
                                    )}
                                     {activities.length > 0 && 
                                        <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => setViewingResource({ name: room.name, activities })}>
                                            <History className="h-3 w-3 mr-1"/>Details
                                        </Button>
                                    }
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
