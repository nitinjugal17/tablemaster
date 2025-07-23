
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, PackageSearch, Save, Edit3, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Menu, MenuItem as MenuItemType } from '@/lib/types';
import { getMenus, saveMenus as saveMenusAction, getMenuItems } from '@/app/actions/data-management-actions';
import { MenuEditor } from '@/components/admin/menu/MenuEditor';
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

export default function MenusManagementPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [fetchedMenus, fetchedMenuItems] = await Promise.all([getMenus(), getMenuItems()]);
        setMenus(fetchedMenus);
        setAllMenuItems(fetchedMenuItems);
      } catch (error) {
        toast({ title: "Error", description: "Could not load menus or menu items.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleOpenEditor = (menu?: Menu) => {
    setEditingMenu(menu);
    setIsEditorOpen(true);
  };
  
  const handleSaveMenu = (menuToSave: Menu) => {
    setIsSaving(true);
    let updatedMenus;
    const existingIndex = menus.findIndex(m => m.id === menuToSave.id);
    if (existingIndex > -1) {
        updatedMenus = menus.map(m => m.id === menuToSave.id ? menuToSave : m);
    } else {
        updatedMenus = [...menus, menuToSave];
    }
    
    setMenus(updatedMenus); // Update local state immediately
    
    saveMenusAction(updatedMenus).then(result => {
      if (result.success) {
        toast({ title: "Success", description: "Menus saved successfully." });
        setIsEditorOpen(false);
        setEditingMenu(undefined);
      } else {
        toast({ title: "Error", description: `Failed to save menus: ${result.message}`, variant: "destructive" });
        // Optionally revert state on failure
        // fetchData(); 
      }
    }).finally(() => {
        setIsSaving(false);
    });
  };

  const handleDeleteMenu = async (menuId: string) => {
    const updatedMenus = menus.filter(m => m.id !== menuId);
    setMenus(updatedMenus);
    setIsSaving(true);
    const result = await saveMenusAction(updatedMenus);
    if (result.success) {
      toast({ title: "Menu Deleted", description: "The menu has been successfully deleted." });
    } else {
      toast({ title: "Error", description: `Failed to delete menu: ${result.message}`, variant: "destructive" });
      setMenus(menus); // Revert on failure
    }
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading menus...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
           {isEditorOpen && (
              <MenuEditor
                menu={editingMenu}
                allMenuItems={allMenuItems}
                onSave={handleSaveMenu}
                onClose={() => setIsEditorOpen(false)}
              />
           )}
        </DialogContent>
      </Dialog>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary">Menus</h1>
          <p className="text-muted-foreground">Organize your menu items into different menus like Lunch, Dinner, or Seasonal Specials.</p>
        </div>
        <Button onClick={() => handleOpenEditor()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Menu
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Existing Menus</CardTitle>
          <CardDescription>View, edit, or delete your current menus. Changes are saved immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          {menus.length > 0 ? (
            <div className="space-y-4">
              {menus.map(menu => (
                <Card key={menu.id} className="shadow-sm">
                    <CardHeader className="flex flex-row justify-between items-start pb-2">
                        <div>
                            <CardTitle className="text-lg">{menu.name}</CardTitle>
                            {menu.description && <CardDescription>{menu.description}</CardDescription>}
                        </div>
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEditor(menu)}>
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
                                        <AlertDialogTitle>Are you sure you want to delete "{menu.name}"?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone and will permanently delete the menu.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteMenu(menu.id)}>Delete Menu</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm text-muted-foreground">
                            <strong>{Array.isArray(menu.menuItemIds) ? menu.menuItemIds.length : 0}</strong> item(s) in this menu.
                         </p>
                    </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <PackageSearch className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-muted-foreground mb-2">No Menus Found</h2>
              <p className="text-muted-foreground">Click 'Add New Menu' to create your first menu.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
