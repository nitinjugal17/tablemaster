
"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { RestaurantTable, TableStatus } from '@/lib/types';
import { ALL_TABLE_STATUSES } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, ListFilter, Loader2, MoreVertical, Columns3, Save, SquarePen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as AlertDialogFooterComponent, // Renamed to avoid conflict
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
import { Table, TableBody, TableCell, TableHead, TableHeader as TableHeaderComponent, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getRestaurantTables, saveRestaurantTables } from '@/app/actions/data-management-actions';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";


const tableEditorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Table name/number is required."),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1."),
  status: z.enum(ALL_TABLE_STATUSES),
  notes: z.string().optional(),
  outletId: z.string().optional(),
});
type TableEditorValues = z.infer<typeof tableEditorSchema>;

interface TableEditorProps {
  table?: Partial<RestaurantTable>;
  onSave: (data: TableEditorValues) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

const TableEditor: React.FC<TableEditorProps> = ({ table, onSave, onClose, isSaving }) => {
  const form = useForm<TableEditorValues>({
    resolver: zodResolver(tableEditorSchema),
    defaultValues: {
      id: table?.id || "",
      name: table?.name || "",
      capacity: table?.capacity || 1,
      status: table?.status || 'Available',
      notes: table?.notes || "",
      outletId: table?.outletId || "",
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl text-primary">
          {table?.id ? `Edit Table: ${table.name}` : "Create New Table"}
        </DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Table Name/Number *</FormLabel>
                <FormControl><Input placeholder="e.g., T1, Window Booth, Patio 5" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity *</FormLabel>
                <FormControl><Input type="number" min="1" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {ALL_TABLE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="outletId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Outlet (Optional)</FormLabel>
                <FormControl><Input placeholder="e.g., outlet-123" {...field} /></FormControl>
                 <FormDescription>Assign this table to a specific outlet ID.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea placeholder="e.g., Near window, high-traffic area" {...field} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Save Table
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};


export default function TableManagementPage() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [editingTable, setEditingTable] = useState<Partial<RestaurantTable> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [filterValues, setFilterValues] = useState({
    status: 'all',
    capacityMin: '',
    capacityMax: '',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getRestaurantTables();
      setTables(items);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      toast({ title: "Error Loading Tables", description: "Could not load tables from data source.", variant: "destructive" });
      setTables([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleFilterChange = (filterName: keyof typeof filterValues, value: string | number) => {
    setFilterValues(prev => ({ ...prev, [filterName]: String(value) }));
  };

  const clearFilters = () => {
    setFilterValues({ status: 'all', capacityMin: '', capacityMax: '' });
    setSearchTerm('');
  };
  
  const handleSaveTable = async (data: TableEditorValues) => {
    setIsSaving(true);
    let updatedTables;
    const tableToSave: RestaurantTable = {
        id: data.id || crypto.randomUUID(),
        name: data.name,
        capacity: data.capacity,
        status: data.status,
        notes: data.notes,
        outletId: data.outletId || undefined,
    };
    const index = tables.findIndex(t => t.id === tableToSave.id);

    if (index > -1) {
        updatedTables = tables.map(t => t.id === tableToSave.id ? tableToSave : t);
    } else {
        updatedTables = [...tables, tableToSave];
    }

    try {
        const result = await saveRestaurantTables(updatedTables);
        if (result.success) {
            toast({ title: "Tables Saved", description: `${tableToSave.name} has been saved successfully.` });
            setTables(updatedTables);
        } else {
            toast({ title: "Error Saving", description: result.message, variant: "destructive" });
        }
    } catch(e) {
         toast({ title: "Error", description: "An unexpected error occurred while saving.", variant: "destructive" });
    } finally {
        setIsSaving(false);
        setIsEditorOpen(false);
    }
  };
  
  const handleDeleteTable = async (tableId: string) => {
    setIsSaving(true);
    const updatedTables = tables.filter(t => t.id !== tableId);
    const result = await saveRestaurantTables(updatedTables);
    if(result.success) {
        toast({ title: "Table Deleted", description: "The table has been removed."});
        setTables(updatedTables);
    } else {
        toast({ title: "Error Deleting", description: result.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleAddNewTable = () => {
    setEditingTable(undefined); 
    setIsEditorOpen(true);
  };

  const handleEditTable = (table: RestaurantTable) => {
    setEditingTable(table);
    setIsEditorOpen(true);
  };

  const filteredTables = tables.filter(table => {
    const searchMatch = searchTerm.toLowerCase() === '' ||
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (table.notes && table.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const statusMatch = filterValues.status === 'all' || table.status === filterValues.status;
    
    const capacityMin = parseInt(filterValues.capacityMin);
    const capacityMax = parseInt(filterValues.capacityMax);
    const capacityMatch = 
        (isNaN(capacityMin) || table.capacity >= capacityMin) &&
        (isNaN(capacityMax) || table.capacity <= capacityMax);

    return searchMatch && statusMatch && capacityMatch;
  });

  const getStatusBadgeVariant = (status: TableStatus) => {
    switch (status) {
      case 'Available': return 'default';
      case 'Occupied': return 'destructive';
      case 'Reserved': return 'secondary';
      case 'Maintenance': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={(open) => { setIsEditorOpen(open); if (!open) setEditingTable(undefined);}}>
        <DialogContent className="sm:max-w-lg">
          {isEditorOpen && <TableEditor table={editingTable} onSave={handleSaveTable} onClose={() => setIsEditorOpen(false)} isSaving={isSaving} />}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Table Management</h1>
          <p className="text-muted-foreground">Configure your restaurant's tables, capacities, and statuses. Changes are saved immediately.</p>
        </div>
        <Button onClick={handleAddNewTable} className="flex-grow sm:flex-grow-0">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Table
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="font-headline">Restaurant Tables ({tables.length})</CardTitle>
            <CardDescription>Overview of all configured tables.</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
             <Input 
                placeholder="Search by name, notes..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm"><ListFilter className="mr-2 h-4 w-4"/> Filters</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 z-50" align="end">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter Options</h4>
                    <p className="text-sm text-muted-foreground">Refine your table list.</p>
                  </div>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="filterStatus">Status</Label>
                      <Select value={filterValues.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger id="filterStatus" className="col-span-2 h-8">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          {ALL_TABLE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="capacityMin">Min Capacity</Label>
                      <Input id="capacityMin" type="number" value={filterValues.capacityMin} onChange={(e) => handleFilterChange('capacityMin', e.target.value)} placeholder="Min" className="col-span-2 h-8"/>
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="capacityMax">Max Capacity</Label>
                      <Input id="capacityMax" type="number" value={filterValues.capacityMax} onChange={(e) => handleFilterChange('capacityMax', e.target.value)} placeholder="Max" className="col-span-2 h-8"/>
                    </div>
                  </div>
                  <Button onClick={clearFilters} variant="outline" size="sm">Clear Filters</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Loading tables...</p>
            </div>
          ) : filteredTables.length > 0 ? (
            <Table>
              <TableHeaderComponent>
                <TableRow>
                  <TableHead>Name/Number</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeaderComponent>
              <TableBody>
                {filteredTables.map(table => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium text-primary">{table.name}</TableCell>
                    <TableCell>{table.capacity}</TableCell>
                    <TableCell><Badge variant={getStatusBadgeVariant(table.status)}>{table.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs" title={table.notes || undefined}>{table.notes || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isSaving}><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTable(table)}><Edit3 className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitleComponent>Are you sure you want to delete "{table.name}"?</AlertDialogTitleComponent>
                                        <AlertDialogDescription>This action cannot be undone and will permanently delete the table.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooterComponent>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteTable(table.id)}>Confirm Delete</AlertDialogAction>
                                    </AlertDialogFooterComponent>
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
                <Columns3 className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
                <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Tables Found</h2>
                <p className="text-muted-foreground">
                    {searchTerm || Object.values(filterValues).some(v => v !== 'all' && v !== '') ? 
                     "No tables match your current search/filter criteria." : 
                     "Your restaurant has no tables configured. Add some!"}
                </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

