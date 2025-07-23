
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, PackageSearch, Save, Edit3, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Addon, AddonGroup } from '@/lib/types';
import { getAddonGroups, saveAddonGroups } from '@/app/actions/data-management-actions';
import { useCurrency } from '@/hooks/useCurrency';
import { AddonGroupEditor } from '@/components/admin/menu/AddonGroupEditor';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';

// Helper to safely parse the addons array
const getAddonsArray = (addons: Addon[] | string | undefined): Addon[] => {
    if (Array.isArray(addons)) {
        return addons;
    }
    if (typeof addons === 'string') {
        try {
            const parsed = JSON.parse(addons);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse addons string:", addons, e);
            return [];
        }
    }
    return [];
};

export default function AddonsManagementPage() {
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [initialAddonGroups, setInitialAddonGroups] = useState<AddonGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAddonGroup, setEditingAddonGroup] = useState<AddonGroup | undefined>(undefined);

  const { toast } = useToast();
  const { currencySymbol, convertPrice } = useCurrency();

  useEffect(() => {
    async function fetchAddons() {
      setIsLoading(true);
      try {
        const fetchedAddonGroups = await getAddonGroups();
        setAddonGroups(fetchedAddonGroups);
        setInitialAddonGroups(JSON.parse(JSON.stringify(fetchedAddonGroups)));
      } catch (error) {
        toast({ title: "Error", description: "Could not load add-on groups.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchAddons();
  }, [toast]);

  const handleOpenEditor = (group?: AddonGroup) => {
    setEditingAddonGroup(group);
    setIsEditorOpen(true);
  };
  
  const handleSaveAddonGroup = (groupToSave: AddonGroup) => {
    setAddonGroups(prev => {
        const existingIndex = prev.findIndex(g => g.id === groupToSave.id);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = groupToSave;
            return updated;
        }
        return [...prev, groupToSave];
    });
    setIsEditorOpen(false);
    setEditingAddonGroup(undefined);
    toast({ title: "Add-on Group Saved Locally", description: `Changes to "${groupToSave.name}" are local until you save all changes.`});
  };

  const handleDeleteAddonGroup = (groupId: string) => {
    setAddonGroups(prev => prev.filter(g => g.id !== groupId));
    toast({ title: "Add-on Group Deleted Locally", description: `Group marked for deletion. Save all changes to persist.`, variant: "destructive"});
  }

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
        const result = await saveAddonGroups(addonGroups);
        if (result.success) {
            toast({ title: "Success", description: "Add-on groups saved successfully."});
            setInitialAddonGroups(JSON.parse(JSON.stringify(addonGroups)));
        } else {
            toast({ title: "Error", description: `Failed to save add-on groups: ${result.message}`, variant: "destructive"});
        }
    } catch (error) {
        toast({ title: "Error", description: "An unexpected error occurred while saving.", variant: "destructive"});
    } finally {
        setIsSaving(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading add-ons...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-xl">
           {isEditorOpen && (
              <AddonGroupEditor
                addonGroup={editingAddonGroup}
                onSave={handleSaveAddonGroup}
                onClose={() => setIsEditorOpen(false)}
              />
           )}
        </DialogContent>
      </Dialog>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Add-on Groups</h1>
          <p className="text-muted-foreground">Create and manage groups of add-ons (e.g., "Extra Toppings", "Choice of Sides") to apply to menu items.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => handleOpenEditor()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Add-on Group
            </Button>
            <Button onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save All Changes
            </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Existing Add-on Groups</CardTitle>
          <CardDescription>View, edit, or delete your current add-on groups. Changes are temporary until saved.</CardDescription>
        </CardHeader>
        <CardContent>
          {addonGroups.length > 0 ? (
            <div className="space-y-4">
              {addonGroups.map(group => {
                const addonsArray = getAddonsArray(group.addons);
                return (
                <Card key={group.id} className="shadow-sm">
                    <CardHeader className="flex flex-row justify-between items-start pb-2">
                        <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            {group.description && <CardDescription>{group.description}</CardDescription>}
                        </div>
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditor(group)}>
                                <Edit3 className="h-4 w-4 mr-1"/>Edit
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="h-4 w-4 mr-1"/>Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to delete "{group.name}"?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the add-on group and its associations with menu items upon saving.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteAddonGroup(group.id)}>Delete Locally</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                            {addonsArray.map(addon => (
                                <span key={addon.id} className="font-mono text-xs p-1 bg-muted rounded-sm">
                                    {addon.name}: {currencySymbol}{convertPrice(addon.price).toFixed(2)}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
              )})}
            </div>
          ) : (
             <div className="text-center py-16">
              <PackageSearch className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Add-on Groups Found</h2>
              <p className="text-muted-foreground">Click 'Add New Add-on Group' to start.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
