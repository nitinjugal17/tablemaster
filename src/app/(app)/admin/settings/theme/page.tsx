
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { saveGeneralSettings as saveGeneralSettingsAction } from '@/app/actions/data-management-actions';
import { applyThemeToGlobalsCss } from '@/app/actions/theme-actions';
import type { Theme, ThemeColorPalette, InvoiceSetupSettings } from '@/lib/types';
import { DEFAULT_LIGHT_THEME_COLORS, DEFAULT_DARK_THEME_COLORS } from '@/lib/types';
import { ArrowLeft, Save, Palette, Trash2, PlusCircle, Edit, CheckCircle, Loader2, Wand } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from '@/components/ui/separator';

const colorPaletteSchema = z.object({
  background: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format (e.g., 0 0% 100%)"),
  foreground: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  primary: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  primaryForeground: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  secondary: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  secondaryForeground: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  accent: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  accentForeground: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  muted: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  mutedForeground: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  card: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  cardForeground: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  popover: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  popoverForeground: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  border: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  input: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
  ring: z.string().regex(/^(\d{1,3}\s\d{1,3}%\s\d{1,3}%)$/, "Invalid HSL format"),
});

const themeFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Theme name must be at least 3 characters."),
  lightColors: colorPaletteSchema,
  darkColors: colorPaletteSchema,
});

type ThemeFormValues = z.infer<typeof themeFormSchema>;

const PALETTE_FIELDS: Array<keyof ThemeColorPalette> = [
  'background', 'foreground', 'primary', 'primaryForeground', 
  'secondary', 'secondaryForeground', 'accent', 'accentForeground',
  'muted', 'mutedForeground', 'card', 'cardForeground', 
  'popover', 'popoverForeground', 'border', 'input', 'ring'
];

// Define Preset Themes
const PRESET_THEMES: Theme[] = [
  {
    id: 'preset-default-tablemaster', name: 'TableMaster Default',
    lightColors: DEFAULT_LIGHT_THEME_COLORS,
    darkColors: DEFAULT_DARK_THEME_COLORS,
  },
  {
    id: 'preset-vintage-sepia', name: 'Vintage Sepia',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '30 60% 50%', accent: '45 50% 40%', background: '40 30% 92%', card: '40 30% 92%' },
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '30 50% 45%', accent: '45 40% 35%', background: '35 20% 15%', card: '35 20% 15%' },
  },
  {
    id: 'preset-forest-green', name: 'Forest Green',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '120 39% 40%', accent: '100 30% 35%', background: '100 10% 95%' },
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '120 39% 35%', accent: '100 30% 30%', background: '110 15% 10%' },
  },
  {
    id: 'preset-ocean-blue', name: 'Ocean Blue',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '210 70% 50%', accent: '200 60% 45%', background: '200 20% 96%' },
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '210 70% 45%', accent: '200 60% 40%', background: '205 30% 12%' },
  },
  {
    id: 'preset-fiery-red', name: 'Fiery Red (Main App Theme)',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '7 57% 43%', secondary: '130 20% 52%', accent: '130 20% 42%', background: '43 51% 89%' },
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '7 50% 50%', secondary: '130 15% 35%', accent: '130 25% 50%', background: '0 0% 10%' },
  },
  {
    id: 'preset-royal-purple', name: 'Royal Purple',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '270 50% 50%', accent: '280 40% 45%', background: '260 20% 95%' },
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '270 50% 45%', accent: '280 40% 40%', background: '275 25% 11%' },
  },
  {
    id: 'preset-sunny-yellow', name: 'Sunny Yellow',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '45 90% 55%', accent: '50 80% 50%', background: '50 30% 94%' },
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '45 80% 50%', accent: '50 70% 45%', background: '40 30% 10%' },
  },
  {
    id: 'preset-cool-gray', name: 'Cool Gray',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '220 10% 50%', accent: '210 8% 45%', background: '220 5% 96%' },
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '220 10% 45%', accent: '210 8% 40%', background: '220 15% 10%' },
  },
  {
    id: 'preset-earthy-brown', name: 'Earthy Brown',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '30 40% 40%', accent: '25 35% 35%', background: '35 15% 93%' },
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '30 40% 35%', accent: '25 35% 30%', background: '30 20% 10%' },
  },
  {
    id: 'preset-charcoal-dark', name: 'Charcoal Dark',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '210 10% 35%', accent: '200 8% 30%', background: '0 0% 98%' }, // Darker primary on light for contrast
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '210 10% 30%', accent: '200 8% 25%', background: '220 10% 8%', card: '220 10% 10%' },
  },
  {
    id: 'preset-lavender-dream', name: 'Lavender Dream',
    lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '250 50% 60%', accent: '260 40% 55%', background: '255 30% 95%' },
    darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '250 50% 55%', accent: '260 40% 50%', background: '250 20% 10%' },
  }
];


export default function ThemeManagementPage() {
  const { toast } = useToast();
  const { settings: generalSettings, isLoadingSettings, refreshGeneralSettings } = useGeneralSettings();
  
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | undefined>(undefined);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null); // null for new, string for editing existing/preset
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      id: crypto.randomUUID(), // Default for a new theme
      name: "New Custom Theme",
      lightColors: DEFAULT_LIGHT_THEME_COLORS,
      darkColors: DEFAULT_DARK_THEME_COLORS,
    },
  });

  useEffect(() => {
    if (!isLoadingSettings && generalSettings.availableThemes) {
      try {
        const parsedThemes = JSON.parse(generalSettings.availableThemes) as Theme[];
        setThemes(parsedThemes);
        setActiveThemeId(generalSettings.activeThemeId || (parsedThemes.length > 0 ? parsedThemes[0].id : undefined));
        if (!editingThemeId && parsedThemes.length > 0) { // Auto-load first theme if not editing
           // handleEditTheme(parsedThemes.find(t => t.id === (generalSettings.activeThemeId || parsedThemes[0].id)) || parsedThemes[0]);
        }
      } catch (e) {
        console.error("Failed to parse themes from general settings:", e);
        toast({ title: "Error loading themes", description: "Could not parse theme data. Initializing with default.", variant: "destructive" });
        setThemes([{id: 'default-theme', name: 'Default Theme', lightColors: DEFAULT_LIGHT_THEME_COLORS, darkColors: DEFAULT_DARK_THEME_COLORS}]);
        setActiveThemeId('default-theme');
      }
    } else if (!isLoadingSettings && !generalSettings.availableThemes) {
        // Initialize with the default TableMaster theme if no themes are stored
        const defaultAppTheme = PRESET_THEMES.find(p => p.id === 'preset-default-tablemaster') || {id: 'default-theme', name: 'Default Theme', lightColors: DEFAULT_LIGHT_THEME_COLORS, darkColors: DEFAULT_DARK_THEME_COLORS};
        setThemes([defaultAppTheme]);
        setActiveThemeId(defaultAppTheme.id);
        // handleEditTheme(defaultAppTheme);
    }
  }, [generalSettings, isLoadingSettings, toast]);

  const handleEditTheme = (theme: Theme) => {
    setEditingThemeId(theme.id);
    form.reset({
      id: theme.id,
      name: theme.name,
      lightColors: theme.lightColors,
      darkColors: theme.darkColors,
    });
  };
  
  const handleApplyPreset = (preset: Theme) => {
    setEditingThemeId(null); // Signal that we are creating a new theme based on a preset
    form.reset({
        id: crypto.randomUUID(), 
        name: `${preset.name} (Custom)`, 
        lightColors: { ...preset.lightColors },
        darkColors: { ...preset.darkColors },
    });
    toast({ title: "Preset Loaded", description: `"${preset.name}" values loaded. Save to create a new theme.` });
  };

  const handleAddNewTheme = () => {
    setEditingThemeId(null); 
    form.reset({
      id: crypto.randomUUID(),
      name: `Custom Theme ${themes.length + 1}`,
      lightColors: DEFAULT_LIGHT_THEME_COLORS,
      darkColors: DEFAULT_DARK_THEME_COLORS,
    });
  };

  const handleDeleteTheme = (themeId: string) => {
    if (themeId === activeThemeId) {
      toast({ title: "Cannot Delete", description: "Cannot delete the active theme.", variant: "destructive" });
      return;
    }
    if (themes.length <= 1) {
      toast({ title: "Cannot Delete", description: "Cannot delete the last remaining theme.", variant: "destructive" });
      return;
    }
    setThemes(prev => prev.filter(t => t.id !== themeId));
    if (editingThemeId === themeId) { // If deleting the theme being edited, reset form
        handleAddNewTheme();
    }
    toast({ title: "Theme Deleted (Locally)", description: "Save all changes to make this permanent." });
  };

  const onSubmit = async (data: ThemeFormValues) => {
    setIsSaving(true);
    const themeToSave: Theme = {
      id: data.id || crypto.randomUUID(), // Ensure ID exists for new themes from preset
      name: data.name,
      lightColors: data.lightColors,
      darkColors: data.darkColors,
    };

    let updatedThemesList: Theme[];
    if (themes.find(t => t.id === themeToSave.id)) { // Editing existing theme
      updatedThemesList = themes.map(t => t.id === themeToSave.id ? themeToSave : t);
    } else { // Adding new theme (either from scratch or preset)
      updatedThemesList = [...themes, themeToSave];
    }
    setThemes(updatedThemesList);
    
    const newActiveThemeId = activeThemeId || themeToSave.id; // If no active theme, set this one
    if (!activeThemeId) setActiveThemeId(newActiveThemeId);

    const settingsToSave: Partial<InvoiceSetupSettings> = {
        ...generalSettings,
        availableThemes: JSON.stringify(updatedThemesList),
        activeThemeId: newActiveThemeId,
    };

    const saveGeneralResult = await saveGeneralSettingsAction(settingsToSave as InvoiceSetupSettings);
    if (saveGeneralResult.success) {
      toast({ title: "Theme Settings Saved", description: "Theme configurations updated in general settings." });
      await refreshGeneralSettings();
      
      const themeToApply = updatedThemesList.find(t => t.id === newActiveThemeId);
      if (themeToApply) {
        const applyCssResult = await applyThemeToGlobalsCss(themeToApply);
        if (applyCssResult.success) {
          toast({ title: "Theme Applied to CSS", description: "Visual theme updated. You might need to refresh." });
        } else {
          toast({ title: "CSS Apply Error", description: applyCssResult.message, variant: "destructive" });
        }
      }
      // Do not reset form here, user might want to continue tweaking.
      // setEditingThemeId(null); 
      // form.reset({ name: "", lightColors: DEFAULT_LIGHT_THEME_COLORS, darkColors: DEFAULT_DARK_THEME_COLORS, id: undefined });
    } else {
      toast({ title: "Error Saving Themes", description: saveGeneralResult.message, variant: "destructive" });
    }
    setIsSaving(false);
  };
  
  const handleSetActiveTheme = async (themeId: string) => {
    setIsSaving(true); // Use general saving indicator
    setActiveThemeId(themeId);
    
    const themeToApply = themes.find(t => t.id === themeId);
    if (!themeToApply) {
        toast({ title: "Error", description: "Selected theme not found.", variant: "destructive"});
        setIsSaving(false);
        return;
    }

    const settingsToSave: Partial<InvoiceSetupSettings> = {
        ...generalSettings,
        activeThemeId: themeId,
        availableThemes: JSON.stringify(themes), // Save current list of themes too
    };

    const saveGeneralResult = await saveGeneralSettingsAction(settingsToSave as InvoiceSetupSettings);
    if (saveGeneralResult.success) {
        await refreshGeneralSettings();
        const applyCssResult = await applyThemeToGlobalsCss(themeToApply);
        if (applyCssResult.success) {
          toast({ title: "Theme Applied!", description: `${themeToApply.name} is now active. Refresh to see changes.` });
        } else {
          toast({ title: "CSS Apply Error", description: applyCssResult.message, variant: "destructive" });
        }
    } else {
      toast({ title: "Error Activating Theme", description: saveGeneralResult.message, variant: "destructive" });
       setActiveThemeId(generalSettings.activeThemeId); // Revert if save fails
    }
    setIsSaving(false);
  };

  if (isLoadingSettings) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <Palette className="mr-3 h-7 w-7" /> Theme Management
        </h1>
        <p className="text-muted-foreground">Customize the look and feel of your application. Changes apply globally after saving and applying.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Theme Presets</CardTitle>
              <CardDescription>Start with a preset or create your own theme.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_THEMES.map(preset => (
                    <Button key={preset.id} variant="outline" size="sm" className="justify-start text-left h-auto py-1.5" onClick={() => handleApplyPreset(preset)}>
                      <Wand className="mr-2 h-3.5 w-3.5 text-accent"/>
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Your Custom Themes</CardTitle>
              <CardDescription>Manage your saved themes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {themes.length > 0 ? (
                <ScrollArea className="h-48">
                  {themes.map(theme => (
                    <div key={theme.id} className={`p-3 border rounded-md flex justify-between items-center transition-all mb-2 ${theme.id === activeThemeId ? 'bg-primary/10 border-primary ring-2 ring-primary' : 'hover:bg-muted/50'}`}>
                      <span className={`font-medium ${theme.id === activeThemeId ? 'text-primary' : ''}`}>{theme.name}</span>
                      <div className="space-x-1">
                        {theme.id !== activeThemeId && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleSetActiveTheme(theme.id)} title="Set Active & Apply" disabled={isSaving}>
                            {isSaving && activeThemeId === theme.id ? <Loader2 className="h-4 w-4 animate-spin"/> :<CheckCircle className="h-4 w-4"/>}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTheme(theme)} title="Edit">
                          <Edit className="h-4 w-4"/>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" title="Delete" disabled={theme.id === activeThemeId || themes.length <= 1 || isSaving}>
                              <Trash2 className="h-4 w-4"/>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Theme "{theme.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone and will permanently delete this theme configuration. Save changes to persist.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTheme(theme.id)}>Delete Locally</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No custom themes saved yet.</p>
              )}
            </CardContent>
             <CardFooter>
                <Button onClick={handleAddNewTheme} className="w-full" variant="outline">
                <PlusCircle className="mr-2 h-4 w-4"/> Create New Blank Theme
                </Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="lg:col-span-2 shadow-xl">
           <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                    <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel htmlFor="themeNameInput" className="text-xl">
                            {editingThemeId ? 'Editing Theme:' : 'New Theme Name:'}
                        </FormLabel>
                        <FormControl>
                            <Input id="themeNameInput" {...field} placeholder="e.g., Ocean Breeze, Dark Knight" className="text-lg font-semibold"/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}/>
                    <CardDescription>Define HSL color values (e.g., "210 40% 96%"). All fields are required.</CardDescription>
                    <FormField control={form.control} name="id" render={({ field }) => (<Input type="hidden" {...field} />)} />
                </CardHeader>
                <ScrollArea className="max-h-[calc(100vh-20rem)] lg:max-h-[calc(100vh-25rem)]"> 
                <CardContent className="space-y-8 p-4 md:p-6">
                    <div>
                    <h3 className="text-lg font-semibold mb-3 text-accent border-b pb-1">Light Mode Colors</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        {PALETTE_FIELDS.map(colorKey => (
                        <FormField key={`light-${colorKey}`} control={form.control} name={`lightColors.${colorKey}`} render={({ field }) => (
                            <FormItem>
                            <FormLabel className="capitalize text-sm">{colorKey.replace(/([A-Z])/g, ' $1')}</FormLabel>
                            <FormControl><Input {...field} placeholder="H S% L%" className="h-9 text-sm"/></FormControl>
                            <FormMessage className="text-xs"/>
                            </FormItem>
                        )}/>
                        ))}
                    </div>
                    </div>

                    <Separator className="my-6" />

                    <div>
                    <h3 className="text-lg font-semibold mb-3 text-accent border-b pb-1">Dark Mode Colors</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        {PALETTE_FIELDS.map(colorKey => (
                        <FormField key={`dark-${colorKey}`} control={form.control} name={`darkColors.${colorKey}`} render={({ field }) => (
                            <FormItem>
                            <FormLabel className="capitalize text-sm">{colorKey.replace(/([A-Z])/g, ' $1')}</FormLabel>
                            <FormControl><Input {...field} placeholder="H S% L%" className="h-9 text-sm"/></FormControl>
                            <FormMessage className="text-xs"/>
                            </FormItem>
                        )}/>
                        ))}
                    </div>
                    </div>
                </CardContent>
                </ScrollArea>
                <CardFooter className="pt-6 border-t">
                    <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Theme & Apply Changes
                    </Button>
                </CardFooter>
              </form>
            </Form>
        </Card>
      </div>
    </div>
  );
}
