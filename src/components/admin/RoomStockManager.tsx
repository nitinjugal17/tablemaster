
"use client";

import React, { useState, useEffect } from 'react';
import type { Room, RoomStockItem, MenuItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Package } from 'lucide-react';

interface RoomStockManagerProps {
  room: Room;
  minibarItems: MenuItem[];
  roomStock: RoomStockItem[];
  onSave: (roomId: string, stockItems: RoomStockItem[]) => Promise<void>;
  onClose: () => void;
}

export const RoomStockManager: React.FC<RoomStockManagerProps> = ({ room, minibarItems, roomStock, onSave, onClose }) => {
  const [stockQuantities, setStockQuantities] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize state from props
    const initialQuantities: Record<string, number> = {};
    roomStock.forEach(item => {
      initialQuantities[item.menuItemId] = item.stockQuantity;
    });
    minibarItems.forEach(item => {
      if (initialQuantities[item.id] === undefined) {
        initialQuantities[item.id] = 0; // Default to 0 if not present
      }
    });
    setStockQuantities(initialQuantities);
  }, [roomStock, minibarItems]);

  const handleQuantityChange = (menuItemId: string, value: string) => {
    const quantity = parseInt(value, 10);
    setStockQuantities(prev => ({
      ...prev,
      [menuItemId]: isNaN(quantity) || quantity < 0 ? 0 : quantity,
    }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updatedStockItems: RoomStockItem[] = Object.entries(stockQuantities)
      .filter(([, quantity]) => quantity > 0) // Only save items with stock > 0
      .map(([menuItemId, quantity]) => {
        const existingStockItem = roomStock.find(rs => rs.menuItemId === menuItemId);
        return {
          id: existingStockItem?.id || `${room.id}-${menuItemId}`,
          roomId: room.id,
          menuItemId,
          stockQuantity: quantity,
        };
      });

    await onSave(room.id, updatedStockItems);
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
        <ScrollArea className="h-96 pr-4">
            <div className="space-y-4">
            {minibarItems.length > 0 ? minibarItems.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-2 border rounded-md">
                    <Label htmlFor={`stock-${item.id}`} className="flex-grow">{item.name}</Label>
                    <Input
                        id={`stock-${item.id}`}
                        type="number"
                        min="0"
                        value={stockQuantities[item.id] || 0}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className="w-24 h-9"
                    />
                </div>
            )) : (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                    <Package className="h-10 w-10 mb-3"/>
                    <p className="font-semibold">No Minibar Items Found</p>
                    <p className="text-xs mt-1">To add items here, go to Menu Management and toggle the "Minibar Item" switch for products like drinks or snacks.</p>
                </div>
            )}
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Stock
            </Button>
        </DialogFooter>
    </div>
  );
};
