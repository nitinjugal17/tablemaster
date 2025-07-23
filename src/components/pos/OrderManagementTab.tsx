
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Order, OrderStatus, OrderType, PaymentType, OrderHistoryEvent } from '@/lib/types';
import { updateOrderStatus, updateOrderPaymentDetails } from '@/app/actions/order-actions';
import { ALL_ORDER_STATUSES, ALL_ORDER_TYPES, ALL_PAYMENT_TYPES } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader as TableHeaderComponent, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, isValid, differenceInMinutes, differenceInHours, differenceInSeconds } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrency } from '@/hooks/useCurrency';
import { Clock, CheckCircle, XCircle, Truck, ShoppingBag, Utensils, CreditCard, MoreVertical, Edit3, FileText as FileTextIcon, Loader2, ListOrdered } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


interface OrderManagementTabProps {
    initialOrders: Order[];
    onEditOrder: (order: Order) => void;
    onViewInvoice: (order: Order) => void;
    onViewItems: (order: Order) => void; // New prop for viewing items
    refreshData: () => Promise<void>;
    highlightCount: number;
}

export const OrderManagementTab: React.FC<OrderManagementTabProps> = ({ initialOrders, onEditOrder, onViewInvoice, onViewItems, refreshData, highlightCount }) => {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterOrderType, setFilterOrderType] = useState('all');
    const [filterPaymentType, setFilterPaymentType] = useState('all');
    const { currencySymbol, convertPrice } = useCurrency();
    const { toast } = useToast();
    const [updatingStatusMap, setUpdatingStatusMap] = useState<Record<string, boolean>>({});
    const [updatingPaymentMap, setUpdatingPaymentMap] = useState<Record<string, boolean>>({});
    const [, setTimer] = useState(0); // State to trigger re-renders for timers
    const isMobile = useIsMobile();

    // Sync state with props
    useEffect(() => setOrders(initialOrders), [initialOrders]);
    
    // Timer effect for live updates
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000); // Re-render every second to update timers
        return () => clearInterval(interval);
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
          const searchMatch = searchTerm === '' || order.id.toLowerCase().includes(searchTerm.toLowerCase()) || order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
          const statusMatch = filterStatus === 'all' || order.status === filterStatus;
          const typeMatch = filterOrderType === 'all' || order.orderType === filterOrderType;
          const paymentMatch = filterPaymentType === 'all' || order.paymentType === filterPaymentType;
          return searchMatch && statusMatch && typeMatch && paymentMatch;
        }).sort((a, b) => {
            try {
                const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? parseISO(a.createdAt) : new Date(a.createdAt)) : new Date(0);
                const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? parseISO(b.createdAt) : new Date(b.createdAt)) : new Date(0);
                if (!isValid(dateA) || !isValid(dateB)) return 0;
                return dateB.getTime() - dateA.getTime();
            } catch (e) {
                return 0;
            }
        });
    }, [orders, searchTerm, filterStatus, filterOrderType, filterPaymentType]);

    const handleStatusChange = useCallback(async (orderId: string, newStatus: OrderStatus) => {
        setUpdatingStatusMap(prev => ({...prev, [orderId]: true}));
        const result = await updateOrderStatus(orderId, newStatus);
        if (result.success) {
            toast({ title: "Status Updated", description: result.message });
            await refreshData();
        } else {
            toast({ title: "Update Failed", description: result.message, variant: "destructive" });
        }
        setUpdatingStatusMap(prev => ({...prev, [orderId]: false}));
    }, [refreshData, toast]);
    
    const handlePaymentTypeChange = useCallback(async (order: Order, newPaymentType: PaymentType) => {
        if(order.status === 'Completed' && order.paymentType !== 'Pending') {
            toast({
                title: "Action Not Allowed",
                description: "Payment details for this completed order cannot be changed.",
                variant: "destructive"
            });
            return;
        }

        setUpdatingPaymentMap(prev => ({ ...prev, [order.id]: true }));
        const result = await updateOrderPaymentDetails(order.id, newPaymentType);
        if (result.success) {
            toast({ title: "Payment Type Updated", description: result.message });
            await refreshData();
        } else {
            toast({ title: "Update Failed", description: result.message, variant: "destructive" });
        }
        setUpdatingPaymentMap(prev => ({ ...prev, [order.id]: false }));
    }, [refreshData, toast]);

    const getStatusBadge = (status: OrderStatus) => {
        switch (status) {
          case 'Pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="mr-1 h-3 w-3"/>{status}</Badge>;
          case 'Preparing': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300"><Utensils className="mr-1 h-3 w-3"/>{status}</Badge>;
          case 'Ready for Pickup': return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300"><ShoppingBag className="mr-1 h-3 w-3"/>{status}</Badge>;
          case 'Out for Delivery': return <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-300"><Truck className="mr-1 h-3 w-3"/>{status}</Badge>;
          case 'Completed': return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-1 h-3 w-3"/>{status}</Badge>;
          case 'Cancelled': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3"/>{status}</Badge>;
          default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getPaymentBadge = (paymentType?: PaymentType) => {
        switch(paymentType) {
            case 'Card': return <Badge variant="default" className="bg-sky-500 hover:bg-sky-600"><CreditCard className="mr-1 h-3 w-3"/>{paymentType}</Badge>;
            case 'UPI': return <Badge variant="default" className="bg-indigo-500 hover:bg-indigo-600"><CreditCard className="mr-1 h-3 w-3"/>{paymentType}</Badge>;
            case 'Online': return <Badge variant="default" className="bg-lime-500 hover:bg-lime-600"><CreditCard className="mr-1 h-3 w-3"/>{paymentType}</Badge>;
            case 'Cash': return <Badge variant="secondary"><CreditCard className="mr-1 h-3 w-3"/>{paymentType}</Badge>;
            case 'Pending': default: return <Badge variant="outline"><Clock className="mr-1 h-3 w-3"/>Pending</Badge>;
        }
    }

    const calculateTimeDiff = (start?: string, end?: string): string => {
        if (!start) return '-';
        const startDate = parseISO(start);
        const endDate = end ? parseISO(end) : new Date(); // Compare to now if no end time
        if (!isValid(startDate) || !isValid(endDate)) return '-';

        const diffSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
        if (diffSeconds < 0) return '0s'; // Handle clock skew
        
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;

        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    };

    const renderOrderTimings = (order: Order) => {
        const history = order.history || [];
        const findTimestamp = (status: OrderStatus) => history.find(h => h.status === status)?.timestamp;
        
        const pendingTime = findTimestamp('Pending');
        const prepTime = findTimestamp('Preparing');
        const readyTime = findTimestamp('Ready for Pickup') || findTimestamp('Out for Delivery');
        const completionTime = findTimestamp('Completed') || findTimestamp('Cancelled');

        const approvalDuration = calculateTimeDiff(pendingTime, prepTime);
        const prepDuration = calculateTimeDiff(prepTime, readyTime);
        const completionDuration = calculateTimeDiff(readyTime, completionTime);
        const totalElapsedDuration = calculateTimeDiff(pendingTime, completionTime);

        return (
            <div className="text-xs text-muted-foreground space-y-1">
                <div>Approval: {prepTime ? approvalDuration : (order.status === 'Pending' ? `In Progress... (${calculateTimeDiff(pendingTime)})` : '-')}</div>
                <div>Prep: {readyTime ? prepDuration : (order.status === 'Preparing' ? `In Progress... (${calculateTimeDiff(prepTime)})` : '-')}</div>
                <div>Delivery/Service: {completionTime ? completionDuration : ((order.status === 'Ready for Pickup' || order.status === 'Out for Delivery') ? `In Progress... (${calculateTimeDiff(readyTime)})` : '-')}</div>
                <div className="font-semibold text-foreground/80 pt-1 border-t border-dashed">Total Time: {completionTime ? totalElapsedDuration : `In Progress... (${calculateTimeDiff(pendingTime)})` }</div>
            </div>
        );
    };
    
    const renderMobileOrderRow = (order: Order) => {
        const isRecent = initialOrders.slice(0, highlightCount).some(o => o.id === order.id);
        const isEdited = order.history && order.history.length > 1;
        const previousStatus = isEdited ? order.history![order.history!.length - 2].status : null;
        
        return (
            <div key={order.id} className={cn("p-3 border rounded-lg space-y-3", isRecent && 'bg-blue-50 dark:bg-blue-900/20')}>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-medium text-primary flex items-center gap-1.5">
                            #{String(order.id).substring(0,8)}
                            {isEdited && <TooltipProvider><Tooltip><TooltipTrigger asChild><Edit3 className="h-3 w-3 text-amber-500 cursor-help"/></TooltipTrigger><TooltipContent><p>Updated from: {previousStatus}</p></TooltipContent></Tooltip></TooltipProvider>}
                        </div>
                        <div className="text-xs text-muted-foreground">{order.createdAt && isValid(typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt) ? format(typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt, "h:mm a") : "Invalid Date"}</div>
                    </div>
                     <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mt-1"><MoreVertical className="h-5 w-5"/></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewItems(order)}><ListOrdered className="mr-2 h-4 w-4"/>View Items</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditOrder(order)} disabled={order.status === 'Completed' || order.status === 'Cancelled'}><Edit3 className="mr-2 h-4 w-4"/>Edit Order</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onViewInvoice(order)}><FileTextIcon className="mr-2 h-4 w-4"/>View/Print Invoice</DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold">{order.customerName}</span>
                    <span className="font-bold text-accent">{currencySymbol}{convertPrice(order.total).toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs">
                    <Badge variant={order.orderType === 'Dine-in' ? 'secondary' : 'outline'}>{order.orderType} {order.tableNumber && `(T${order.tableNumber})`}</Badge>
                    {getPaymentBadge(order.paymentType)}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="p-1 h-auto text-left w-full justify-start font-normal" disabled={updatingStatusMap[order.id]}>
                             {updatingStatusMap[order.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : getStatusBadge(order.status)}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {ALL_ORDER_STATUSES.map(status => (
                            <DropdownMenuItem key={status} onClick={() => handleStatusChange(order.id, status)} disabled={order.status === status}>{status}</DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><CardTitle>Manage Orders</CardTitle><CardDescription>View, filter, and manage all orders.</CardDescription></div>
                <div className="flex flex-wrap gap-2">
                    <Input placeholder="Search ID or Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-40"/>
                    <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-full sm:w-[140px]"><SelectValue/></SelectTrigger><SelectContent>{['all', ...ALL_ORDER_STATUSES].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select>
                    <Select value={filterOrderType} onValueChange={setFilterOrderType}><SelectTrigger className="w-full sm:w-[140px]"><SelectValue/></SelectTrigger><SelectContent>{['all', ...ALL_ORDER_TYPES].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                    <Select value={filterPaymentType} onValueChange={setFilterPaymentType}><SelectTrigger className="w-full sm:w-[140px]"><SelectValue/></SelectTrigger><SelectContent>{['all', ...ALL_PAYMENT_TYPES].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-28rem)]">
                    {isMobile ? (
                        <div className="space-y-4 pr-2">
                           {filteredOrders.length > 0 ? filteredOrders.map(renderMobileOrderRow) : <div className="text-center py-10 text-muted-foreground">No orders match your criteria.</div>}
                        </div>
                    ) : (
                        <Table>
                            <TableHeaderComponent><TableRow>
                                <TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead>
                                <TableHead>Timings</TableHead>
                                <TableHead>Total</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Actions</TableHead>
                            </TableRow></TableHeaderComponent>
                            <TableBody>
                                {filteredOrders.map((order, index) => {
                                    const isRecent = index < highlightCount;
                                    const isEdited = order.history && order.history.length > 1;
                                    const previousStatus = isEdited ? order.history![order.history!.length - 2].status : null;
                                    return (
                                    <TableRow key={order.id} className={cn(isRecent && 'bg-blue-50 dark:bg-blue-900/20')}>
                                        <TableCell>
                                            <div className="font-medium text-primary flex items-center gap-1">
                                                #{String(order.id).substring(0,8)}...
                                                {isEdited && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Edit3 className="h-3 w-3 text-amber-500 cursor-help"/>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Updated from: {previousStatus}</p>
                                                        </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{order.createdAt && isValid(typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt) ? format(typeof order.createdAt === 'string' ? parseISO(order.createdAt) : order.createdAt, "h:mm a") : "Invalid Date"}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold">{order.customerName}</div>
                                            <div className="text-xs text-muted-foreground">{order.orderType} {order.tableNumber && `(T${order.tableNumber})`}</div>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="p-1 h-auto text-left w-full justify-start font-normal" disabled={updatingStatusMap[order.id]}>
                                                        {updatingStatusMap[order.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : getStatusBadge(order.status)}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    {ALL_ORDER_STATUSES.map(status => (
                                                        <DropdownMenuItem 
                                                            key={status} 
                                                            onClick={() => handleStatusChange(order.id, status)}
                                                            disabled={order.status === status}
                                                        >
                                                            {status}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell>{renderOrderTimings(order)}</TableCell>
                                        <TableCell>{currencySymbol}{convertPrice(order.total).toFixed(2)}</TableCell>
                                        <TableCell>
                                        <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="p-1 h-auto text-left w-full justify-start" disabled={updatingPaymentMap[order.id] || (order.status === 'Completed' && order.paymentType !== 'Pending')}>
                                                        {updatingPaymentMap[order.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : getPaymentBadge(order.paymentType)}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    {ALL_PAYMENT_TYPES.map(pt => (
                                                        <DropdownMenuItem 
                                                            key={pt} 
                                                            onClick={() => handlePaymentTypeChange(order, pt)}
                                                            disabled={order.paymentType === pt}
                                                        >
                                                            {pt}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5"/></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onViewItems(order)}><ListOrdered className="mr-2 h-4 w-4"/>View Items</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onEditOrder(order)}><Edit3 className="mr-2 h-4 w-4"/>Edit Order</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onViewInvoice(order)}><FileTextIcon className="mr-2 h-4 w-4"/>View/Print Invoice</DropdownMenuItem>
                                            </DropdownMenuContent></DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
