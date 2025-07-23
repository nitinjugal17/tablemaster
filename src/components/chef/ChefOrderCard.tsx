
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Order, OrderItem, OrderHistoryEvent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, StickyNote, Printer, Clock } from 'lucide-react';
import { format, parseISO, differenceInHours, differenceInMinutes, isValid } from 'date-fns';

// Define a unique key for each item within an order for state tracking
const getItemKey = (orderId: string, itemId: string, itemIndex: number, portion?: string) => `${orderId}-${itemId}-${portion || 'fixed'}-${itemIndex}`;

interface ChefOrderCardProps {
  order: Order;
  preparedItems: Record<string, boolean>;
  onItemToggle: (orderId: string, itemKey: string, isPrepared: boolean) => void;
  onMarkOrderReady: (orderId: string) => void;
  onPrintKot: (order: Order) => void;
  isUpdatingStatus: boolean;
}

const ChefOrderCard: React.FC<ChefOrderCardProps> = ({ order, preparedItems, onItemToggle, onMarkOrderReady, onPrintKot, isUpdatingStatus }) => {
  const orderItemsArray: OrderItem[] = useMemo(() => {
    if (Array.isArray(order.items)) {
        return order.items;
    }
    if (typeof order.items === 'string') {
        try {
            return JSON.parse(order.items);
        } catch (e) {
            console.error("Failed to parse order items string:", order.items, e);
            return [];
        }
    }
    return [];
  }, [order.items]);
  
  const allItemsPrepared = orderItemsArray.every((item, index) => preparedItems[getItemKey(order.id, item.menuItemId, index, item.selectedPortion)]);
  
  const getSmartTimeAgo = (dateInput?: string | Date): string => {
    if (!dateInput) return "Unknown time";
    try {
        const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
        if (!isValid(date)) return "Invalid time";
        
        const now = new Date();
        const hoursDiff = differenceInHours(now, date);
        const minutesDiff = differenceInMinutes(now, date);
        
        if (hoursDiff >= 24) {
            return format(date, 'MMM d, yyyy');
        }
        if (hoursDiff >= 1) {
            return `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} ago`;
        }
        if (minutesDiff >= 1) {
            return `${minutesDiff} min ago`;
        }
        return "Just now";
    } catch (e) {
      return "Unknown time";
    }
  };

  const timeSincePlaced = getSmartTimeAgo(order.createdAt);
  
  const prepEvent = order.history?.find(h => h.status === 'Preparing');
  const timeSinceApproved = getSmartTimeAgo(prepEvent?.timestamp);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
            <div>
                <CardTitle className="font-headline text-xl text-primary">Order #{String(order.id).substring(0, 8)}</CardTitle>
                <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  <p>Placed: {timeSincePlaced}</p>
                  {prepEvent && <p className="flex items-center"><Clock className="h-3 w-3 mr-1"/>Waiting for: <strong>{timeSinceApproved}</strong></p>}
                  <p>Customer: {order.customerName}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => onPrintKot(order)}>
                    <Printer className="mr-2 h-4 w-4"/> Print KOT
                 </Button>
                <Badge variant={order.orderType === 'Dine-in' ? "secondary" : "outline"}>{order.orderType}{order.tableNumber ? ` - T${order.tableNumber}` : ''}</Badge>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {orderItemsArray.map((item, index) => {
            const itemKey = getItemKey(order.id, item.menuItemId, index, item.selectedPortion);
            const isPrepared = preparedItems[itemKey] || false;
            const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                                    ? `${item.name} (${item.selectedPortion})` 
                                    : item.name;
            return (
              <li key={itemKey} className={`p-2 rounded-md transition-colors ${isPrepared ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Checkbox
                      id={itemKey}
                      checked={isPrepared}
                      onCheckedChange={(checked) => onItemToggle(order.id, itemKey, !!checked)}
                      className="mr-3 h-5 w-5"
                      aria-label={`Mark ${itemDisplayName} as prepared`}
                    />
                    <label htmlFor={itemKey} className={`font-medium text-sm ${isPrepared ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>
                      {item.quantity} x {itemDisplayName}
                    </label>
                  </div>
                  {isPrepared && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                </div>
                {item.note && (
                  <div className="mt-1.5 pl-8 flex items-start gap-1.5">
                    <StickyNote className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-500 italic break-words">{item.note}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => onMarkOrderReady(order.id)}
          disabled={!allItemsPrepared || isUpdatingStatus}
          className="w-full"
        >
          {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          {allItemsPrepared ? "Mark Order Ready for Pickup/Service" : "All Items Not Prepared"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ChefOrderCard;
