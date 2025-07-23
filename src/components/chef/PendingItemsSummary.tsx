"use client";

import React, { useMemo } from 'react';
import type { Order, OrderItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Utensils } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const getItemKey = (orderId: string, itemId: string, itemIndex: number, portion?: string) => `${orderId}-${itemId}-${portion || 'fixed'}-${itemIndex}`;

interface AggregatedItem {
  name: string;
  menuItemId: string;
  quantity: number;
  orders: { orderId: string; quantity: number; notes?: string; portion?: string }[];
}

export const PendingItemsSummary: React.FC<{ orders: Order[], preparedItemsMap: Record<string, Record<string, boolean>> }> = ({ orders, preparedItemsMap }) => {
    const summary = useMemo(() => {
        const itemMap = new Map<string, AggregatedItem>(); // Using Map for easier checks
        orders.forEach(order => {
            const orderItemsArray: OrderItem[] = Array.isArray(order.items)
              ? order.items
              : typeof order.items === 'string'
              ? JSON.parse(order.items)
              : [];
              
            orderItemsArray.forEach((item, index) => {
                const itemKeyInOrder = getItemKey(order.id, item.menuItemId, index, item.selectedPortion);
                const isItemPrepared = preparedItemsMap[order.id]?.[itemKeyInOrder] || false;

                if (!isItemPrepared) {
                    // Use a composite key for the map that includes portion to aggregate correctly
                    const aggregationKey = `${item.menuItemId}-${item.selectedPortion || 'fixed'}`;
                    const displayName = item.selectedPortion && item.selectedPortion !== 'fixed' ? `${item.name} (${item.selectedPortion})` : item.name;

                    if (!itemMap.has(aggregationKey)) {
                        itemMap.set(aggregationKey, { name: displayName, menuItemId: item.menuItemId, quantity: 0, orders: [] });
                    }
                    
                    const aggItem = itemMap.get(aggregationKey)!;
                    aggItem.quantity += item.quantity;
                    aggItem.orders.push({ 
                        orderId: String(order.id).substring(0,8), 
                        quantity: item.quantity,
                        notes: item.note,
                        portion: item.selectedPortion && item.selectedPortion !== 'fixed' ? item.selectedPortion : undefined,
                    });
                }
            });
        });
        return Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);
    }, [orders, preparedItemsMap]);

    if (summary.length === 0) {
        return (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary flex items-center">
                        <Utensils className="mr-2 h-5 w-5"/> Total Pending Items
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">All items for current orders are marked as prepared!</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center">
                    <Utensils className="mr-2 h-5 w-5"/> Total Pending Items
                </CardTitle>
                <CardDescription>Aggregated list of all items needing preparation across active orders.</CardDescription>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <ScrollArea className="h-[500px] lg:h-[calc(100vh-25rem)] pr-3">
                        <div className="space-y-3">
                        {summary.map(aggItem => (
                            <div key={`${aggItem.menuItemId}-${aggItem.name}`} className="p-3 border rounded-lg bg-muted/50">
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-base text-foreground">{aggItem.name}</span>
                                    <Badge variant="default" className="text-lg">{aggItem.quantity}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                    {aggItem.orders.map((o, i) => (
                                         <Tooltip key={`${aggItem.menuItemId}-${o.orderId}-${i}`} delayDuration={100}>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-2 p-1 rounded-sm hover:bg-muted">
                                                    <span>Order #{o.orderId}: <Badge variant="secondary" className="font-mono">{o.quantity} unit(s)</Badge></span>
                                                </div>
                                            </TooltipTrigger>
                                            {o.notes && 
                                                <TooltipContent>
                                                    <p>Note: {o.notes}</p>
                                                </TooltipContent>
                                            }
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
};
