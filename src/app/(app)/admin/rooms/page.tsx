
"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Room, RoomStockItem, MenuItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, Loader2, MoreVertical, Save, BedDouble, PackageSearch, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitleComponent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadTableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getRooms, saveRooms, getRoomStock, saveRoomStock, getMenuItems } from '@/app/actions/data-management-actions';
import { RoomEditor } from '@/components/admin/RoomEditor';
import { RoomStockManager } from '@/components/admin/RoomStockManager';
import { useCurrency } from '@/hooks/useCurrency';

export default function RoomManagementPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [allRoomStock, setAllRoomStock] = useState<RoomStockItem[]>([]);
  
  const [editingRoom, setEditingRoom] = useState<Partial<Room> | undefined>(undefined);
  const [managingStockForRoom, setManagingStockForRoom] = useState<Room | undefined>(undefined);
  
  const [isRoomEditorOpen, setIsRoomEditorOpen] = useState(false);
  const [isStockManagerOpen, setIsStockManagerOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedRooms, fetchedStock, fetchedMenuItems] = await Promise.all([
        getRooms(),
        getRoomStock(),
        getMenuItems()
      ]);
      setRooms(fetchedRooms);
      setAllRoomStock(fetchedStock);
      setMenuItems(fetchedMenuItems);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error Loading Data", description: "Could not load rooms or stock data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveRoom = async (roomData: Room) => {
    setIsSaving(true);
    let updatedRooms;
    const existingIndex = rooms.findIndex(r => r.id === roomData.id);
    if (existingIndex > -1) {
        updatedRooms = [...rooms];
        updatedRooms[existingIndex] = roomData;
    } else {
        updatedRooms = [...rooms, roomData];
    }
    setRooms(updatedRooms);

    try {
        const result = await saveRooms(updatedRooms);
        if (result.success) {
            toast({ title: "Room Saved", description: `${roomData.name} has been saved successfully.` });
            await fetchData(); // Refresh data from source
        } else {
            toast({ title: "Error Saving Room", description: result.message, variant: "destructive" });
            setRooms(rooms); // Revert local state on failure
        }
    } catch (e) {
        toast({ title: "Error", description: "An unexpected error occurred while saving.", variant: "destructive" });
        setRooms(rooms); // Revert local state on failure
    } finally {
        setIsSaving(false);
        setIsRoomEditorOpen(false);
        setEditingRoom(undefined);
    }
  };
  
  const handleSaveStock = async (roomId: string, stockItems: RoomStockItem[]) => {
    try {
      const result = await saveRoomStock(roomId, stockItems);
      if (result.success) {
        toast({ title: "Room Stock Saved", description: `Stock for room has been updated.`});
        await fetchData(); // Refetch all data to get latest stock
      } else {
        toast({ title: "Error Saving Stock", description: result.message, variant: "destructive" });
      }
    } catch (e) {
       toast({ title: "Error", description: "An unexpected error occurred while saving room stock.", variant: "destructive" });
    }
    setIsStockManagerOpen(false);
    setManagingStockForRoom(undefined);
  };

  const handleOpenEditor = (room?: Room) => {
    setEditingRoom(room);
    setIsRoomEditorOpen(true);
  };
  
  const handleOpenStockManager = (room: Room) => {
    setManagingStockForRoom(room);
    setIsStockManagerOpen(true);
  };
  
  const handleDeleteRoom = async (roomId: string) => {
    setIsSaving(true);
    const updatedRooms = rooms.filter(r => r.id !== roomId);
    try {
        const result = await saveRooms(updatedRooms);
        if(result.success) {
            toast({ title: "Room Deleted", description: "The room has been removed."});
            setRooms(updatedRooms);
        } else {
            toast({ title: "Error Deleting Room", description: result.message, variant: "destructive" });
        }
    } catch(e) {
        toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const minibarItems = useMemo(() => menuItems.filter(item => item.isMinibarItem), [menuItems]);

  return (
    <div className="space-y-8">
      <Dialog open={isRoomEditorOpen} onOpenChange={(open) => { if (!open) setEditingRoom(undefined); setIsRoomEditorOpen(open); }}>
        <DialogContent className="sm:max-w-2xl">
           <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              {editingRoom?.id ? `Edit Room: ${editingRoom.name}` : "Create New Room"}
            </DialogTitle>
          </DialogHeader>
          {isRoomEditorOpen && <RoomEditor room={editingRoom} onSave={handleSaveRoom} onClose={() => setIsRoomEditorOpen(false)} />}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isStockManagerOpen} onOpenChange={(open) => { if (!open) setManagingStockForRoom(undefined); setIsStockManagerOpen(open); }}>
        <DialogContent className="sm:max-w-lg">
           <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-primary">
              Manage Stock for {managingStockForRoom?.name}
            </DialogTitle>
             <DialogDescription>Set quantities for minibar items available in this room.</DialogDescription>
          </DialogHeader>
          {isStockManagerOpen && managingStockForRoom && (
            <RoomStockManager 
              room={managingStockForRoom}
              minibarItems={minibarItems}
              roomStock={allRoomStock.filter(s => s.roomId === managingStockForRoom.id)}
              onSave={handleSaveStock}
              onClose={() => setIsStockManagerOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center"><BedDouble className="mr-3 h-7 w-7"/>Room Management</h1>
          <p className="text-muted-foreground">Configure your bookable rooms, details, photos, and minibar stock.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => handleOpenEditor()} className="flex-grow sm:flex-grow-0">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Room
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Configured Rooms ({rooms.length})</CardTitle>
          <CardDescription>Overview of all bookable rooms. Changes are saved automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : rooms.length > 0 ? (
            <Table>
              <ShadTableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Price/Night</TableHead>
                  <TableHead>Amenities</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </ShadTableHeader>
              <TableBody>
                {rooms.map(room => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium text-primary">{room.name}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>{currencySymbol}{convertPrice(room.pricePerNight).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{room.amenities}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isSaving}><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenEditor(room)}>
                            <Edit3 className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenStockManager(room)}>
                            <Package className="mr-2 h-4 w-4" />Manage Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog> 
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitleComponent>Are you sure?</AlertDialogTitleComponent>
                                <AlertDialogDescription>
                                  This action will permanently delete the room "{room.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteRoom(room.id)}>Delete Room</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center py-16">
                 <PackageSearch className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Rooms Found</h2>
                <p className="text-muted-foreground">Click 'Add New Room' to start.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
