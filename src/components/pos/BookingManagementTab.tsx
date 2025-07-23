
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { Booking, BookingStatus, RestaurantTable, Room, OrderItem } from '@/lib/types';
import { updateBookingDetails } from '@/app/actions/booking-actions';
import { ALL_BOOKING_STATUSES } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader as TableHeaderComponent, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MoreVertical, SlidersHorizontal, CalendarDays, Users, PackageSearch, CheckCircle, XCircle, ClockIcon, SquarePen, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile'; // Import the hook
import { cn } from '@/lib/utils'; // Import cn

interface BookingManagementTabProps {
    initialBookings: Booking[];
    initialTables: RestaurantTable[];
    initialRooms: Room[];
    refreshData: () => Promise<void>;
}

export const BookingManagementTab: React.FC<BookingManagementTabProps> = ({ initialBookings, initialTables, initialRooms, refreshData }) => {
    const [bookings, setBookings] = useState<Booking[]>(initialBookings);
    const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
    const [rooms, setRooms] = useState<Room[]>(initialRooms);
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const [bookingForAction, setBookingForAction] = useState<Booking | null>(null);
    const [isUpdateStatusDialogOpen, setIsUpdateStatusDialogOpen] = useState(false);
    const [targetStatusForUpdate, setTargetStatusForUpdate] = useState<BookingStatus | null>(null);
    const [resourceToAssign, setResourceToAssign] = useState<string | undefined>(undefined);
    const [adminNotes, setAdminNotes] = useState("");
    const [isUpdatingBooking, setIsUpdatingBooking] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

    useEffect(() => setBookings(initialBookings), [initialBookings]);
    useEffect(() => setTables(initialTables), [initialTables]);
    useEffect(() => setRooms(initialRooms), [initialRooms]);

    const handleOpenStatusUpdateDialog = (booking: Booking, targetStatus: BookingStatus) => {
        setBookingForAction(booking);
        setTargetStatusForUpdate(targetStatus);
        setResourceToAssign(booking.assignedResourceId || booking.requestedResourceId || undefined);
        setAdminNotes("");
        setIsUpdateStatusDialogOpen(true);
    };

    const handleConfirmStatusUpdate = async () => {
        if (!bookingForAction || !targetStatusForUpdate) return;
        if (targetStatusForUpdate === 'confirmed' && !resourceToAssign) {
          toast({ title: "Resource Required", description: "Please assign a resource to confirm the booking.", variant: "destructive" });
          return;
        }

        setIsUpdatingBooking(true);
        const result = await updateBookingDetails(bookingForAction.id, {
            status: targetStatusForUpdate,
            assignedResourceId: resourceToAssign,
            adminNote: adminNotes || undefined,
        });

        if (result.success && result.updatedBooking) {
            await refreshData();
            toast({ title: "Booking Status Updated", description: `Booking #${String(bookingForAction.id).substring(0,8)} status changed to ${targetStatusForUpdate}.` });
            setIsUpdateStatusDialogOpen(false);
            setBookingForAction(null);
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setIsUpdatingBooking(false);
    };

    const filteredBookings = bookings.filter(booking => {
        const searchMatch = searchTerm.toLowerCase() === '' || booking.id.toLowerCase().includes(searchTerm.toLowerCase()) || booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || (booking.phone && booking.phone.includes(searchTerm)) || (booking.email && booking.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const statusMatch = filterStatus === 'all' || booking.status === filterStatus;
        const typeMatch = filterType === 'all' || (booking.bookingType || 'table') === filterType;
        const dateMatch = !filterDate || (booking.date && isValid(parseISO(booking.date)) && isWithinInterval(parseISO(booking.date), { start: startOfDay(filterDate), end: endOfDay(filterDate) }));
        return searchMatch && statusMatch && typeMatch && dateMatch;
      }).sort((a, b) => {
        try { return parseISO(b.date).getTime() - parseISO(a.date).getTime(); }
        catch { return 0; }
    });

    const availableResourcesForAssignment = useMemo(() => {
        if (!bookingForAction) return { tables: [], rooms: [] };
        const availableTables = tables.filter(t => t.status === 'Available' || t.id === bookingForAction.assignedResourceId || t.id === bookingForAction.requestedResourceId);
        const availableRooms = rooms.filter(r => r.capacity >= (bookingForAction.partySize || 1)); 
        return { tables: availableTables, rooms: availableRooms };
    }, [tables, rooms, bookingForAction]);
    
    const getStatusBadge = (status: BookingStatus) => {
        switch(status) {
          case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><ClockIcon className="mr-1 h-3 w-3"/>Pending</Badge>;
          case 'confirmed': return <Badge variant="default" className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-1 h-3 w-3"/>Confirmed</Badge>;
          case 'cancelled': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3"/>Cancelled</Badge>;
          default: return <Badge variant="secondary">{status}</Badge>;
        }
    };
    
    const renderMobileBookingRow = (booking: Booking) => {
        const resourceList = (booking.bookingType || 'table') === 'table' ? tables : rooms;
        const assignedResource = resourceList.find(r => r.id === booking.assignedResourceId);
        const itemsArray: OrderItem[] = Array.isArray(booking.items)
            ? booking.items
            : typeof booking.items === 'string' && booking.items.trim().startsWith('[')
            ? JSON.parse(booking.items)
            : [];
        return(
            <div key={booking.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-medium text-primary">#{String(booking.id).substring(0,8)}...</div>
                        <div className="text-xs text-muted-foreground">{format(parseISO(booking.date), "MMM d, yyyy")} @ {booking.time}</div>
                    </div>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mt-1"><MoreVertical className="h-5 w-5"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {booking.status === 'pending' && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'confirmed')} disabled={isUpdatingBooking}><CheckCircle className="mr-2 h-4 w-4"/> Confirm</DropdownMenuItem>}
                        {booking.status === 'confirmed' && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'confirmed')} disabled={isUpdatingBooking}><SquarePen className="mr-2 h-4 w-4"/> Re-assign</DropdownMenuItem>}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'cancelled')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4"/> Cancel</DropdownMenuItem>}
                        {booking.status === 'cancelled' && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'pending')} disabled={isUpdatingBooking}><ClockIcon className="mr-2 h-4 w-4"/> Reopen</DropdownMenuItem>}
                    </DropdownMenuContent></DropdownMenu>
                </div>
                <div>
                    <p className="font-semibold">{booking.customerName}</p>
                    <p className="text-sm text-muted-foreground">{booking.phone}</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs">
                    {getStatusBadge(booking.status)}
                    <Badge variant="outline" className="capitalize">Type: {booking.bookingType || 'table'}</Badge>
                    <Badge variant="outline" className="capitalize">Guests: {booking.partySize}</Badge>
                    {assignedResource && <Badge variant="default" className="capitalize">Res: {assignedResource.name}</Badge>}
                    {itemsArray.length > 0 && <Badge variant="secondary">{itemsArray.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0)} items</Badge>}
                </div>
            </div>
        );
    }

    return (
        <Card>
             <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div><CardTitle className="font-headline">Manage Bookings</CardTitle><CardDescription>Filter and manage customer reservations.</CardDescription></div>
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-auto flex-grow sm:flex-grow-0 sm:w-40"/>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full sm:w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Statuses</SelectItem>{ALL_BOOKING_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="table">Table</SelectItem><SelectItem value="room">Room</SelectItem></SelectContent>
                    </Select>
                     <Popover>
                        <PopoverTrigger asChild><Button variant={"outline"} className={`w-full sm:w-[200px] justify-start text-left font-normal ${!filterDate && "text-muted-foreground"}`}><CalendarDays className="mr-2 h-4 w-4" />{filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus /></PopoverContent>
                     </Popover>
                     <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterType('all'); setFilterDate(undefined); }}>Clear</Button>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-28rem)]">
                    {isMobile ? (
                        <div className="space-y-4 pr-2">
                           {filteredBookings.length > 0 ? filteredBookings.map(renderMobileBookingRow) : <div className="text-center py-10 text-muted-foreground">No bookings match your criteria.</div>}
                        </div>
                    ) : (
                        <Table>
                            <TableHeaderComponent><TableRow>
                                <TableHead>ID / Date</TableHead><TableHead>Customer</TableHead><TableHead>Details</TableHead>
                                <TableHead>Resource</TableHead><TableHead>Pre-Order</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                            </TableRow></TableHeaderComponent>
                            <TableBody>
                            {filteredBookings.length > 0 ? filteredBookings.map(booking => {
                                const resourceList = (booking.bookingType || 'table') === 'table' ? tables : rooms;
                                const assignedResource = resourceList.find(r => r.id === booking.assignedResourceId);
                                const itemsArray: OrderItem[] = Array.isArray(booking.items)
                                ? booking.items
                                : typeof booking.items === 'string' && booking.items.trim().startsWith('[')
                                ? JSON.parse(booking.items)
                                : [];
                                return ( <TableRow key={booking.id}>
                                    <TableCell><div className="font-medium text-primary">#{String(booking.id).substring(0,8)}...</div><div className="text-xs text-muted-foreground">{format(parseISO(booking.date), "MMM d, yyyy")} @ {booking.time}</div></TableCell>
                                    <TableCell><div>{booking.customerName}</div><div className="text-xs text-muted-foreground">{booking.phone}</div></TableCell>
                                    <TableCell><div className="flex items-center"><Users className="mr-1 h-3 w-3"/>Party: {booking.partySize}</div></TableCell>
                                    <TableCell><div className="flex items-center gap-2"><Badge variant="outline" className="capitalize">{booking.bookingType || 'table'}</Badge>{assignedResource && <Badge variant="default">{assignedResource.name}</Badge>}</div></TableCell>
                                    <TableCell>{itemsArray.length > 0 ? <Badge variant="outline">{itemsArray.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0)} items</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                                    <TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        {booking.status === 'pending' && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'confirmed')} disabled={isUpdatingBooking}><CheckCircle className="mr-2 h-4 w-4"/> Confirm</DropdownMenuItem>}
                                        {booking.status === 'confirmed' && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'confirmed')} disabled={isUpdatingBooking}><SquarePen className="mr-2 h-4 w-4"/> Re-assign</DropdownMenuItem>}
                                        {(booking.status === 'pending' || booking.status === 'confirmed') && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'cancelled')} className="text-destructive focus:text-destructive"><XCircle className="mr-2 h-4 w-4"/> Cancel</DropdownMenuItem>}
                                        {booking.status === 'cancelled' && <DropdownMenuItem onClick={() => handleOpenStatusUpdateDialog(booking, 'pending')} disabled={isUpdatingBooking}><ClockIcon className="mr-2 h-4 w-4"/> Reopen</DropdownMenuItem>}
                                    </DropdownMenuContent></DropdownMenu></TableCell>
                                </TableRow>
                            )}) : (
                            <TableRow><TableCell colSpan={7} className="text-center h-24">No bookings match your criteria.</TableCell></TableRow>
                            )}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </CardContent>

             <Dialog open={isUpdateStatusDialogOpen} onOpenChange={setIsUpdateStatusDialogOpen}>
                <DialogContent>
                <DialogHeader><DialogTitle className="capitalize">{targetStatusForUpdate} Booking #{bookingForAction?.id.substring(0,8)}</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                    <p>Customer: {bookingForAction?.customerName} | Party Size: {bookingForAction?.partySize} | Type: <span className="capitalize font-semibold">{bookingForAction?.bookingType}</span></p>
                    {targetStatusForUpdate === 'confirmed' && (
                    <div>
                        <Label htmlFor="resourceAssignSelect">Assign {bookingForAction?.bookingType}</Label>
                        <Select value={resourceToAssign || ''} onValueChange={setResourceToAssign}>
                        <SelectTrigger id="resourceAssignSelect"><SelectValue placeholder={`Choose a ${bookingForAction?.bookingType}`} /></SelectTrigger>
                        <SelectContent>
                            {bookingForAction?.bookingType === 'table' ? availableResourcesForAssignment.tables.map(table => ( <SelectItem key={table.id} value={table.id} >{table.name} (Cap: {table.capacity})</SelectItem> )) : 
                            availableResourcesForAssignment.rooms.map(room => ( <SelectItem key={room.id} value={room.id}>{room.name} (Cap: {room.capacity})</SelectItem> ))}
                        </SelectContent>
                        </Select>
                    </div>
                    )}
                    <div>
                        <Label htmlFor="adminNotes">Notes for Customer (Optional)</Label>
                        <Textarea id="adminNotes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder={targetStatusForUpdate === 'cancelled' ? 'Reason for cancellation...' : 'e.g., Special arrangements made.'}/>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleConfirmStatusUpdate} disabled={isUpdatingBooking}>{isUpdatingBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Confirm</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

    