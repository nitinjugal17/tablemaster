"use client";

import React, { useState, useMemo } from 'react';
import type { StockItem, MenuItem as MenuItemType, StockMenuMapping, OrderItem } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Printer, Calculator, PackageSearch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

interface StockLevelsTabProps {
  stockItems: StockItem[];
  menuItems: MenuItemType[];
  stockMenuMappings: StockMenuMapping[];
}

interface CalculationItem {
  menuItemId: string;
  name: string;
  quantity: number;
}

interface RequiredStock {
    name: string;
    totalQuantity: number;
    unit: string;
}

export const StockLevelsTab: React.FC<StockLevelsTabProps> = ({ stockItems, menuItems, stockMenuMappings }) => {
  const { toast } = useToast();
  const [calculationList, setCalculationList] = useState<CalculationItem[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [selectedMenuItemQuantity, setSelectedMenuItemQuantity] = useState<number>(1);
  const [requiredStock, setRequiredStock] = useState<RequiredStock[]>([]);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);

  const sortedStockItems = useMemo(() => {
    return [...stockItems].sort((a, b) => {
      const aPercentage = a.reorderLevel > 0 ? (a.currentStock / a.reorderLevel) * 100 : 101;
      const bPercentage = b.reorderLevel > 0 ? (b.currentStock / b.reorderLevel) * 100 : 101;
      return aPercentage - bPercentage;
    });
  }, [stockItems]);

  const getStockStatusColor = (current: number, reorder: number): string => {
    if (reorder === 0) return 'hsl(var(--muted))';
    const percentage = (current / reorder) * 100;
    if (percentage <= 25) return 'hsl(var(--destructive))';
    if (percentage <= 75) return 'hsl(var(--primary))'; // Using primary for warning, adjust if needed
    return 'hsl(142.1 76.2% 42.2%)'; // A green color
  };
  
  const handleAddToCalculationList = () => {
    if (!selectedMenuItemId) {
        toast({ title: "No item selected", variant: "destructive" });
        return;
    }
    const menuItem = menuItems.find(mi => mi.id === selectedMenuItemId);
    if (!menuItem) {
        toast({ title: "Menu item not found", variant: "destructive" });
        return;
    }
    setCalculationList(prev => {
        const existing = prev.find(item => item.menuItemId === selectedMenuItemId);
        if (existing) {
            return prev.map(item => item.menuItemId === selectedMenuItemId ? { ...item, quantity: item.quantity + selectedMenuItemQuantity } : item);
        }
        return [...prev, { menuItemId: selectedMenuItemId, name: menuItem.name, quantity: selectedMenuItemQuantity }];
    });
    setSelectedMenuItemId('');
    setSelectedMenuItemQuantity(1);
  };
  
  const handleCalculateStock = () => {
    const required: Record<string, { totalQuantity: number; unit: string; name: string; }> = {};
    
    calculationList.forEach(calcItem => {
      const mappings = stockMenuMappings.filter(m => m.menuItemId === calcItem.menuItemId);
      mappings.forEach(mapping => {
        const stockItem = stockItems.find(si => si.id === mapping.stockItemId);
        if (stockItem) {
          if (!required[stockItem.id]) {
            required[stockItem.id] = { totalQuantity: 0, unit: stockItem.unit, name: stockItem.name };
          }
          // Here, we should handle unit conversions if mapping.unitUsed is different from stockItem.unit,
          // but for now, we'll assume they are compatible or the same.
          required[stockItem.id].totalQuantity += mapping.quantityUsedPerServing * calcItem.quantity;
        }
      });
    });

    setRequiredStock(Object.values(required).sort((a,b) => a.name.localeCompare(b.name)));
    setIsResultDialogOpen(true); // Open the dialog with the results
  };

  const handlePrintReceipt = () => {
    const printContents = document.getElementById('stock-receipt-content')?.innerHTML;
    if (printContents) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(`<html><head><title>Stock Order List</title><style>
        body { font-family: monospace; font-size: 12px; margin: 5mm; }
        .receipt-header { text-align: center; margin-bottom: 10px; }
        .receipt-header h3 { margin: 0; font-size: 16px; }
        .receipt-item { display: flex; justify-content: space-between; padding: 2px 0; }
      </style></head><body>`);
      printWindow?.document.write(printContents);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      setTimeout(() => { printWindow?.print(); }, 250);
    }
  };


  return (
    <>
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Requirement Calculation</DialogTitle>
            <DialogDescription>
              Based on the {calculationList.reduce((sum, item) => sum + item.quantity, 0)} menu item(s) you selected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <div id="stock-receipt-content" className="p-3 border rounded-md bg-white text-black font-mono text-sm">
                <div className="receipt-header">
                    <h3>Stock Order List</h3>
                    <p className="text-xs">{new Date().toLocaleString()}</p>
                </div>
                <hr className="border-dashed border-black my-2" />
                {requiredStock.length > 0 ? (
                    <div className="space-y-1">
                       {requiredStock.map(stock => (
                           <div key={stock.name} className="receipt-item">
                               <span>{stock.name}</span>
                               <span>{stock.totalQuantity.toFixed(2)} {stock.unit}</span>
                           </div>
                       ))}
                    </div>
                ) : (
                    <p className="text-center py-4">No required stock. The selected items may not have stock mappings.</p>
                )}
             </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handlePrintReceipt} variant="outline"><Printer className="mr-2 h-4 w-4"/>Print List</Button>
            <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Stock Levels</CardTitle>
            <CardDescription>
              Live overview of all inventory items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-28rem)]">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-[30%]">Item</TableHead><TableHead>Category</TableHead>
                  <TableHead>Current/Reorder</TableHead><TableHead className="w-[25%]">Level</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {sortedStockItems.map(item => (
                    <TableRow key={item.id} className={item.currentStock <= item.reorderLevel ? 'bg-muted/50' : ''}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                      <TableCell>{item.currentStock} / {item.reorderLevel} <span className="text-muted-foreground text-xs">{item.unit}</span></TableCell>
                      <TableCell>
                        <Progress 
                          value={item.reorderLevel > 0 ? (item.currentStock / item.reorderLevel) * 100 : 0} 
                          className="w-full h-3" 
                          indicatorStyle={{ backgroundColor: getStockStatusColor(item.currentStock, item.reorderLevel) }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Calculator className="mr-2"/>Stock Requirement Calculator</CardTitle>
              <CardDescription>Plan for an event or a busy day by calculating ingredient needs based on expected menu item sales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                  <Label>1. Add Menu Items to Calculate</Label>
                  <div className="flex items-end gap-2 mt-1">
                      <div className="flex-grow">
                          <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
                              <SelectTrigger><SelectValue placeholder="Select a menu item..." /></SelectTrigger>
                              <SelectContent><ScrollArea className="h-48">{menuItems.map(mi => <SelectItem key={mi.id} value={mi.id}>{mi.name}</SelectItem>)}</ScrollArea></SelectContent>
                          </Select>
                      </div>
                      <div className="w-24">
                          <Label htmlFor="item-qty" className="text-xs">Quantity</Label>
                          <Input id="item-qty" type="number" min="1" value={selectedMenuItemQuantity} onChange={(e) => setSelectedMenuItemQuantity(Number(e.target.value))} />
                      </div>
                      <Button type="button" onClick={handleAddToCalculationList} size="sm"><PlusCircle className="h-4 w-4"/></Button>
                  </div>
                </div>
                {calculationList.length > 0 && (
                    <ScrollArea className="h-32 border rounded-md p-2">
                      <div className="space-y-2">
                          {calculationList.map((item, index) => (
                              <div key={item.menuItemId} className="flex justify-between items-center text-sm p-1.5 bg-background rounded-md">
                                  <p><span className="font-bold">{item.quantity}x</span> {item.name}</p>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setCalculationList(prev => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4"/></Button>
                              </div>
                          ))}
                      </div>
                    </ScrollArea>
                )}
                <Button type="button" onClick={handleCalculateStock} className="w-full" disabled={calculationList.length === 0}>
                  <Calculator className="mr-2 h-4 w-4"/> Calculate Required Stock
                </Button>
            </CardContent>
        </Card>
      </div>
    </>
  );
};
