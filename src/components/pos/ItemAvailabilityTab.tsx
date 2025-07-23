
"use client";

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import type { MenuItem } from '@/lib/types';
import { getDailyAvailability, saveDailyAvailability } from '@/app/actions/data-management-actions';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ItemAvailabilityTabProps {
  menuItems: MenuItem[];
  refreshData: () => Promise<void>;
}

export const ItemAvailabilityTab: React.FC<ItemAvailabilityTabProps> = ({ menuItems, refreshData }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [disabledItemIds, setDisabledItemIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    getDailyAvailability().then(data => {
      setDisabledItemIds(new Set(data.disabledMenuItemIds));
    });
  }, [menuItems]);

  const handleAvailabilityToggle = async (itemId: string, isAvailable: boolean) => {
    setIsSaving(true);
    const newDisabledIds = new Set(disabledItemIds);
    if (!isAvailable) {
      newDisabledIds.add(itemId);
    } else {
      newDisabledIds.delete(itemId);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const result = await saveDailyAvailability({
      date: today,
      disabledMenuItemIds: Array.from(newDisabledIds),
    });

    if (result.success) {
      setDisabledItemIds(newDisabledIds);
      toast({ title: "Availability Updated", description: "The menu has been updated for today." });
      await refreshData(); // Refresh all POS data
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsSaving(false);
  };
  
  const canToggle = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Item Availability</CardTitle>
        <CardDescription>
          Temporarily disable menu items that are out of stock for the day. This status resets automatically each new day.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-28rem)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Permanent Status</TableHead>
                <TableHead>Today's Availability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.map(item => {
                const isTemporarilyDisabled = disabledItemIds.has(item.id);
                return (
                  <TableRow key={item.id} className={isTemporarilyDisabled ? "bg-muted/50" : ""}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                    <TableCell>
                      {item.isAvailable ? (
                        <span className="flex items-center text-green-600 text-xs"><CheckCircle className="h-3 w-3 mr-1"/>Available</span>
                      ) : (
                        <span className="flex items-center text-red-600 text-xs"><XCircle className="h-3 w-3 mr-1"/>Unavailable</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isSaving ? 
                        <Loader2 className="h-4 w-4 animate-spin"/> :
                        <Switch
                          checked={!isTemporarilyDisabled}
                          onCheckedChange={(checked) => handleAvailabilityToggle(item.id, checked)}
                          disabled={!canToggle || !item.isAvailable}
                          aria-label={`Toggle availability for ${item.name}`}
                        />
                      }
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
