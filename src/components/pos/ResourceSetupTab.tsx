
"use client";

import React, { useState } from 'react';
import type { RestaurantTable, Room } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, BedDouble, Columns3, Edit3 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadTableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RoomEditor } from '@/components/admin/RoomEditor';
import TableEditor from '@/components/admin/tables/TableEditor';
import { useToast } from '@/hooks/use-toast';
import { saveRooms, saveRestaurantTables } from '@/app/actions/data-management-actions';
import { useCurrency } from '@/hooks/useCurrency';

interface ResourceSetupTabProps {
    tables: RestaurantTable[];
    rooms: Room[];
    refreshData: () => Promise<void>;
}

export const ResourceSetupTab: React.FC<ResourceSetupTabProps> = ({ tables: initialTables, rooms: initialRooms, refreshData }) => {
    const { toast } = useToast();
    const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
    const [rooms, setRooms] = useState<Room[]>(initialRooms);

    const [editingTable, setEditingTable] = useState<Partial<RestaurantTable> | undefined>(undefined);
    const [isTableEditorOpen, setIsTableEditorOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Partial<Room> | undefined>(undefined);
    const [isRoomEditorOpen, setIsRoomEditorOpen] = useState(false);
    const { currencySymbol, convertPrice } = useCurrency();
    
    // Sync with props when they change
    React.useEffect(() => setTables(initialTables), [initialTables]);
    React.useEffect(() => setRooms(initialRooms), [initialRooms]);

    const handleSaveTable = async (tableData: RestaurantTable) => {
        let updatedTables;
        const existingIndex = tables.findIndex(t => t.id === tableData.id);

        if (existingIndex > -1) {
            updatedTables = tables.map(t => t.id === tableData.id ? tableData : t);
        } else {
            updatedTables = [...tables, tableData];
        }
        
        const result = await saveRestaurantTables(updatedTables);
        if(result.success) {
            toast({ title: "Tables Saved", description: "Table configuration has been updated." });
            await refreshData();
        } else {
            toast({ title: "Error", description: `Failed to save tables: ${result.message}`, variant: "destructive" });
        }
        setIsTableEditorOpen(false);
    };

    const handleSaveRoom = async (roomData: Room) => {
        let updatedRooms;
         const existingIndex = rooms.findIndex(r => r.id === roomData.id);
        if (existingIndex > -1) {
            updatedRooms = rooms.map(r => r.id === roomData.id ? roomData : r);
        } else {
            updatedRooms = [...rooms, roomData];
        }
        
        const result = await saveRooms(updatedRooms);
        if(result.success) {
            toast({ title: "Rooms Saved", description: "Room configuration has been updated." });
            await refreshData();
        } else {
            toast({ title: "Error", description: `Failed to save rooms: ${result.message}`, variant: "destructive" });
        }
        setIsRoomEditorOpen(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Dialog open={isTableEditorOpen} onOpenChange={setIsTableEditorOpen}>
                <DialogContent>
                  <TableEditor 
                    table={editingTable} 
                    onSave={async (data) => {
                      await handleSaveTable({
                        id: data.id || crypto.randomUUID(),
                        name: data.name,
                        capacity: data.capacity,
                        status: data.status,
                        notes: data.notes,
                        outletId: data.outletId
                      });
                    }} 
                    onClose={() => setIsTableEditorOpen(false)}
                    isSaving={false} // This component handles its own saving state internally for server actions
                  />
                </DialogContent>
            </Dialog>
            <Dialog open={isRoomEditorOpen} onOpenChange={setIsRoomEditorOpen}><DialogContent><RoomEditor room={editingRoom} onSave={handleSaveRoom} onClose={() => setIsRoomEditorOpen(false)} /></DialogContent></Dialog>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center"><Columns3 className="mr-2"/>Tables ({tables.length})</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => { setEditingTable(undefined); setIsTableEditorOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Add Table</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <ShadTableHeader><TableRow><TableHead>Name</TableHead><TableHead>Capacity</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></ShadTableHeader>
                        <TableBody>
                            {tables.map(table => (
                                <TableRow key={table.id}>
                                    <TableCell>{table.name}</TableCell><TableCell>{table.capacity}</TableCell><TableCell>{table.status}</TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditingTable(table); setIsTableEditorOpen(true); }}><Edit3 className="h-4 w-4"/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center"><BedDouble className="mr-2"/>Rooms ({rooms.length})</CardTitle>
                     <Button size="sm" variant="outline" onClick={() => { setEditingRoom(undefined); setIsRoomEditorOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Add Room</Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <ShadTableHeader><TableRow><TableHead>Name</TableHead><TableHead>Capacity</TableHead><TableHead>Price/Night</TableHead><TableHead></TableHead></TableRow></ShadTableHeader>
                        <TableBody>
                           {rooms.map(room => (
                                <TableRow key={room.id}>
                                    <TableCell>{room.name}</TableCell><TableCell>{room.capacity}</TableCell><TableCell>{currencySymbol}{convertPrice(room.pricePerNight).toFixed(2)}</TableCell>
                                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => { setEditingRoom(room); setIsRoomEditorOpen(true); }}><Edit3 className="h-4 w-4"/></Button></TableCell>
                                </TableRow>
                           ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
