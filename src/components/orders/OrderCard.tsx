
"use client"; 

import type { Order, OrderItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Utensils, ShoppingBag, Clock, CheckCircle, XCircle, Truck, CreditCard, AlertCircle, StickyNote } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import React from 'react';
import { cn } from '@/lib/utils'; 
import { useCurrency } from '@/hooks/useCurrency';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrderCardProps {
  order: Order;
  isAdminView?: boolean; 
}

const getStatusStyles = (status: Order['status']) => {
  switch (status) {
    case 'Pending':
      return { icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50' };
    case 'Preparing':
      return { icon: <Utensils className="h-4 w-4" />, color: 'bg-blue-500/20 text-blue-700 border-blue-500/50' };
    case 'Ready for Pickup':
      return { icon: <ShoppingBag className="h-4 w-4" />, color: 'bg-purple-500/20 text-purple-700 border-purple-500/50' };
    case 'Out for Delivery':
        return { icon: <Truck className="h-4 w-4" />, color: 'bg-teal-500/20 text-teal-700 border-teal-500/50'};
    case 'Completed':
      return { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-500/20 text-green-700 border-green-500/50' };
    case 'Cancelled':
      return { icon: <XCircle className="h-4 w-4" />, color: 'bg-red-500/20 text-red-700 border-red-500/50' };
    default:
      return { icon: <AlertCircle className="h-4 w-4" />, color: 'bg-gray-500/20 text-gray-700 border-gray-500/50' };
  }
};

const getPaymentTypeBadgeVariant = (paymentType?: Order['paymentType']) => {
    switch(paymentType) {
        case 'Card': return 'default'; 
        case 'UPI': return 'default'; 
        case 'Online': return 'default';
        case 'Cash': return 'secondary';
        case 'Pending': default: return 'outline';
    }
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const { icon, color } = getStatusStyles(order.status);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const { currencySymbol, convertPrice } = useCurrency();
  const displayTotal = convertPrice(order.total);


  const formattedDate = React.useMemo(() => {
    if (!order.createdAt) return "Date not available";
    try {
        const date = parseISO(order.createdAt);
        if (!isValid(date)) {
            console.warn(`[OrderCard] Invalid createdAt date for order ${order.id}: "${order.createdAt}"`);
            return "Invalid date";
        }
        return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
        console.warn(`[OrderCard] Could not parse createdAt date for order ${order.id}: "${order.createdAt}"`, e);
        return "Invalid date";
    }
  }, [order.createdAt, order.id]);

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="font-headline text-lg text-primary leading-tight">Order #{String(order.id).substring(0, 8)}...</CardTitle>
            <CardDescription className="text-xs">
              {formattedDate}
            </CardDescription>
          </div>
          <Badge variant="outline" className={`py-1 px-2 text-xs font-semibold flex items-center gap-1 ${color} whitespace-nowrap`}>
            {icon} {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div>
            <h4 className="font-semibold text-sm mb-1">Customer: <span className="font-normal">{order.customerName}</span></h4>
        </div>
        <div className="mb-2">
            <h4 className="font-semibold text-sm mb-1">Items ({itemCount}):</h4>
            <ScrollArea className="max-h-24 pr-1"> 
              <ul className="list-none space-y-1.5 text-xs text-muted-foreground">
                  {order.items.map((item: OrderItem, index: number) => {
                    const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                                            ? `${item.name} (${item.selectedPortion})` 
                                            : item.name;
                    return (
                      <li key={`${item.menuItemId}-${index}`} className="border-b border-dashed border-border/50 pb-1 last:border-b-0 last:pb-0">
                          <div className="flex justify-between">
                            <span className="font-medium text-foreground/90">{itemDisplayName} (x{item.quantity})</span>
                            <span className="text-foreground/80">{currencySymbol}{(convertPrice(item.price * item.quantity)).toFixed(2)}</span>
                          </div>
                          {item.note && (
                              <div className="flex items-start gap-1 mt-0.5">
                                  <StickyNote className="h-3 w-3 text-amber-600 mt-px shrink-0" />
                                  <p className="italic text-amber-700 dark:text-amber-500 text-[0.7rem] leading-tight break-words">{item.note}</p>
                              </div>
                          )}
                      </li>
                  )})}
              </ul>
            </ScrollArea>
        </div>
        <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
                <span className="font-semibold">Type:</span> 
                <Badge variant={order.orderType === 'Dine-in' ? 'secondary' : 'outline'}>{order.orderType}</Badge>
                {order.orderType === 'Dine-in' && order.tableNumber && 
                  <span className="font-semibold">Table: <span className="font-normal">{order.tableNumber}</span></span>
                }
            </div>
            <div className="flex items-center gap-2">
                <span className="font-semibold">Payment:</span>
                <Badge 
                    variant={getPaymentTypeBadgeVariant(order.paymentType)} 
                    className={cn(
                        "flex items-center gap-1",
                        order.paymentType === 'Card' && "bg-sky-500 hover:bg-sky-600 text-white",
                        order.paymentType === 'UPI' && "bg-indigo-500 hover:bg-indigo-600 text-white",
                        order.paymentType === 'Online' && "bg-lime-500 hover:bg-lime-600 text-white",
                    )}
                >
                    <CreditCard className="h-3 w-3"/> {order.paymentType || 'Pending'}
                </Badge>
            </div>
            {order.paymentId && <p className="truncate"><span className="font-semibold">Trans. ID:</span> {order.paymentId}</p>}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 pb-3 flex justify-between items-center">
        <p className="text-md font-bold text-accent">Total: {currencySymbol}{displayTotal.toFixed(2)}</p>
      </CardFooter>
    </Card>
  );
};

export default OrderCard;
