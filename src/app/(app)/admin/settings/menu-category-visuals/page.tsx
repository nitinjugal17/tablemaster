
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { saveGeneralSettings as saveGeneralSettingsAction, getMenuItems } from '@/app/actions/data-management-actions';
import type { MenuCategoryEnhancement, InvoiceSetupSettings } from '@/lib/types';
import { ArrowLeft, Save, Loader2, ImagePlus } from 'lucide-react';

export default function MenuCategoryVisualsPage() {
  const { toast } = useToast();
  const { settings: generalSettings, isLoadingSettings, refreshGeneralSettings } = useGeneralSettings();
  
  const [uniqueMenuCategories, setUniqueMenuCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryEnhancements, setCategoryEnhancements] = useState<Record<string, Partial<MenuCategoryEnhancement>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const items = await getMenuItems();
      const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean).sort()));
      setUniqueMenuCategories(categories);
    } catch (error) {
      toast({ title: "Error loading menu categories", variant: "destructive" });
    } finally {
      setIsLoadingCategories(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!isLoadingSettings && generalSettings.menuCategoryEnhancements) {
      try {
        const parsedEnhancements = JSON.parse(generalSettings.menuCategoryEnhancements) as MenuCategoryEnhancement[];
        const map: Record<string, Partial<MenuCategoryEnhancement>> = {};
        parsedEnhancements.forEach(enh => {
          map[enh.categoryId] = enh;
        });
        setCategoryEnhancements(map);
      } catch (e) {
        console.error("Failed to parse menuCategoryEnhancements:", e);
        setCategoryEnhancements({});
      }
    } else if (!isLoadingSettings && !generalSettings.menuCategoryEnhancements) {
        setCategoryEnhancements({});
    }
  }, [generalSettings, isLoadingSettings]);

  const handleCategoryEnhancementChange = (categoryId: string, field: 'backgroundImageUrl' | 'backgroundVideoUrl', value: string) => {
    setCategoryEnhancements(prev => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}), // Start with existing data for the category if any
        categoryId: categoryId, // Ensure categoryId is always present
        [field]: value || undefined, // Set to undefined if value is empty to remove it
      }
    }));
  };

  const handleSaveCategoryVisuals = async () => {
    setIsSaving(true);
    try {
      // Filter out entries that don't have at least one URL, then create a clean array.
      const finalEnhancementsArray: MenuCategoryEnhancement[] = Object.values(categoryEnhancements)
        .filter(enh => enh && (enh.backgroundImageUrl || enh.backgroundVideoUrl))
        .map(enh => ({
          categoryId: enh!.categoryId!, 
          backgroundImageUrl: enh!.backgroundImageUrl || undefined,
          backgroundVideoUrl: enh!.backgroundVideoUrl || undefined,
        }));

      const settingsToSave: Partial<InvoiceSetupSettings> = {
        ...generalSettings,
        menuCategoryEnhancements: JSON.stringify(finalEnhancementsArray),
      };
      
      const result = await saveGeneralSettingsAction(settingsToSave as InvoiceSetupSettings);
      if (result.success) {
        toast({ title: "Menu Category Visuals Saved", description: "Your changes have been saved to general settings." });
        await refreshGeneralSettings();
      } else {
        toast({ title: "Error Saving Visuals", description: result.message, variant: "destructive" });
      }
    } catch (e) {
      console.error("Error saving category visuals:", e);
      toast({ title: "Error Saving Visuals", description: (e as Error).message || "Could not save visuals.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoadingSettings || isLoadingCategories) {
    return (
      <div className="space-y-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
        <div className="flex justify-center items-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading menu category visual settings...</p>
        </div>
    </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <ImagePlus className="mr-3 h-7 w-7" /> Menu Category Visuals
        </h1>
        <p className="text-muted-foreground">
          Set background image or video URLs for specific menu categories.
          These can be used on the homepage category features or menu page.
          Changes are saved to the main `general-settings.json` file.
        </p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Configure Visuals per Category</CardTitle>
          <CardDescription>Enter direct URLs for images or videos. Empty URLs will clear the setting.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-25rem)] pr-3">
            <div className="space-y-6">
              {uniqueMenuCategories.length > 0 ? (
                uniqueMenuCategories.map(category => (
                  <div key={category} className="p-4 border rounded-lg bg-muted/40 shadow-sm">
                    <h4 className="font-semibold text-lg capitalize text-primary mb-3">{category}</h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`cat-img-${category}`} className="text-sm">Background Image URL</Label>
                        <Input 
                          id={`cat-img-${category}`} 
                          value={categoryEnhancements[category]?.backgroundImageUrl || ""}
                          onChange={(e) => handleCategoryEnhancementChange(category, 'backgroundImageUrl', e.target.value)}
                          placeholder="e.g., https://example.com/images/desserts.jpg"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`cat-vid-${category}`} className="text-sm">Background Video URL</Label>
                        <Input 
                          id={`cat-vid-${category}`}
                          value={categoryEnhancements[category]?.backgroundVideoUrl || ""}
                          onChange={(e) => handleCategoryEnhancementChange(category, 'backgroundVideoUrl', e.target.value)}
                          placeholder="e.g., https://example.com/videos/main-courses.mp4"
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Video backgrounds may require specific frontend implementation to display correctly.</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-6">
                  No menu categories found. Add items with categories in Menu Management to configure visuals here.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveCategoryVisuals} disabled={isSaving || isLoadingSettings || isLoadingCategories}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Category Visuals
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
