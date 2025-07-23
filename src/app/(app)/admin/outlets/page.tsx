"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Outlet } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadTableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit3, Trash2, Loader2, MoreVertical, Save, Building } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { getOutlets, saveOutlets as saveOutletsAction } from '@/app/actions/data-management-actions';
import { OutletEditor } from '@/components/admin/OutletEditor';

// Sub-component for the Delete Confirmation Dialog
const DeleteOutletDialog: React.FC<{ outlet: Outlet; onDelete: (id: string) => void; }> = ({ outlet, onDelete }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
        <Trash2 className="mr-2 h-4 w-4"/> Delete
      </DropdownMenuItem>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Outlet "{outlet.name}"?</AlertDialogTitle>
        <AlertDialogDescription>This will mark the outlet for deletion. Save all changes to persist. This may affect associated menu items and tables.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={() => onDelete(outlet.id)}>Delete Locally</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);


export default function OutletsManagementPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [editingOutlet, setEditingOutlet] = useState<Partial<Outlet> | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getOutlets();
      setOutlets(items);
    } catch (error) {
      toast({ title: "Error Loading Outlets", description: "Could not load outlet data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = (data: Outlet) => {
    const newOutlets = [...outlets];
    const index = newOutlets.findIndex(o => o.id === data.id);
    if (index > -1) {
      newOutlets[index] = data;
    } else {
      newOutlets.push(data);
    }
    setOutlets(newOutlets);
    toast({ title: "Outlet Saved (Locally)", description: "Save all changes to persist to the data source." });
    setIsEditorOpen(false);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const result = await saveOutletsAction(outlets);
    if (result.success) {
      toast({ title: "Outlets Saved", description: "All outlet configurations have been saved." });
    } else {
      toast({ title: "Error Saving", description: result.message, variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleDelete = (id: string) => {
    setOutlets(outlets.filter(o => o.id !== id));
    toast({ title: "Outlet Marked for Deletion", description: "Save all changes to persist this deletion.", variant: "destructive" });
  };

  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent>
          <OutletEditor outlet={editingOutlet} onSave={handleSave} onClose={() => setIsEditorOpen(false)} />
        </DialogContent>
      </Dialog>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <Building className="mr-3 h-7 w-7" /> Outlet Management
          </h1>
          <p className="text-muted-foreground">Manage all your F&B outlets from a single interface.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingOutlet(undefined); setIsEditorOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Outlet
          </Button>
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Changes
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Configured Outlets ({outlets.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="animate-spin" /> : (
            <Table>
              <ShadTableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </ShadTableHeader>
              <TableBody>
                {outlets.map(outlet => (
                  <TableRow key={outlet.id}>
                    <TableCell className="font-semibold">{outlet.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{outlet.type.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{outlet.description}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingOutlet(outlet); setIsEditorOpen(true); }}><Edit3 className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                            <DeleteOutletDialog outlet={outlet} onDelete={handleDelete} />
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}