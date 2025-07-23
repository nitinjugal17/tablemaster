
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const hslRegex = /^\s*(\d{1,3})\s+(\d{1,3})%?\s+(\d{1,3})%?\s*$/;
const hslValidator = z.string().refine(val => hslRegex.test(val), {
    message: "Invalid HSL format (e.g., '210 40% 96%')",
});

const colorPaletteSchema = z.object({
  background: hslValidator,
  foreground: hslValidator,
  primary: hslValidator,
  primaryForeground: hslValidator,
  secondary: hslValidator,
  secondaryForeground: hslValidator,
  accent: hslValidator,
  accentForeground: hslValidator,
  muted: hslValidator,
  mutedForeground: hslValidator,
  card: hslValidator,
  cardForeground: hslValidator,
  popover: hslValidator,
  popoverForeground: hslValidator,
  border: hslValidator,
  input: hslValidator,
  ring: hslValidator,
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

const PRESET_THEMES: Theme[] = [
    {
        id: 'preset-fiery-red', name: 'TableMaster Red',
        lightColors: { background: "43 51% 89%", foreground: "0 0% 3.9%", primary: "7 57% 43%", primaryForeground: "0 0% 98%", secondary: "130 20% 52%", secondaryForeground: "0 0% 9%", accent: "130 20% 42%", accentForeground: "0 0% 98%", muted: "0 0% 96.1%", mutedForeground: "0 0% 45.1%", card: "43 51% 89%", cardForeground: "0 0% 3.9%", popover: "43 51% 89%", popoverForeground: "0 0% 3.9%", border: "0 0% 89.8%", input: "0 0% 89.8%", ring: "7 57% 43%" },
        darkColors: { background: "0 0% 10%", foreground: "0 0% 95%", primary: "7 50% 50%", primaryForeground: "0 0% 98%", secondary: "130 15% 35%", secondaryForeground: "0 0% 95%", accent: "130 25% 50%", accentForeground: "0 0% 98%", muted: "0 0% 18%", mutedForeground: "0 0% 60%", card: "0 0% 12%", cardForeground: "0 0% 95%", popover: "0 0% 10%", popoverForeground: "0 0% 95%", border: "0 0% 20%", input: "0 0% 20%", ring: "7 50% 50%" },
    },
    { id: 'preset-ocean-blue', name: 'Ocean Blue', lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: "210 70% 50%", accent: "200 60% 45%", background: "200 20% 96%" }, darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: "210 70% 45%", accent: "200 60% 40%", background: "205 30% 12%" }, },
    { id: 'preset-forest-green', name: 'Forest Green', lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: "120 39% 40%", accent: "100 30% 35%", background: "100 10% 95%" }, darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: "120 39% 35%", accent: "100 30% 30%", background: "110 15% 10%" }, },
    { id: 'preset-royal-purple', name: 'Royal Purple', lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: "270 50% 50%", accent: "280 40% 45%", background: "260 20% 95%" }, darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: "270 50% 45%", accent: "280 40% 40%", background: "275 25% 11%" }, },
    { id: 'preset-sunny-yellow', name: 'Sunny Yellow', lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: "45 90% 55%", accent: "50 80% 50%", background: "50 30% 94%" }, darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: "45 80% 50%", accent: "50 70% 45%", background: "40 30% 10%" }, },
    { id: 'preset-charcoal-dark', name: 'Charcoal Dark', lightColors: { ...DEFAULT_LIGHT_THEME_COLORS, primary: '210 10% 35%', accent: '200 8% 30%', background: '0 0% 98%' }, darkColors: { ...DEFAULT_DARK_THEME_COLORS, primary: '210 10% 30%', accent: '200 8% 25%', background: '220 10% 8%', card: '220 10% 10%' },},
];

const ThemePreviewPanel = ({ lightColors, darkColors }: { lightColors: ThemeColorPalette, darkColors: ThemeColorPalette }) => {
    const getStyleObject = (colors: ThemeColorPalette) => ({
        '--background': colors.background, '--foreground': colors.foreground,
        '--card': colors.card, '--card-foreground': colors.cardForeground,
        '--popover': colors.popover, '--popover-foreground': colors.popoverForeground,
        '--primary': colors.primary, '--primary-foreground': colors.primaryForeground,
        '--secondary': colors.secondary, '--secondary-foreground': colors.secondaryForeground,
        '--muted': colors.muted, '--muted-foreground': colors.mutedForeground,
        '--accent': colors.accent, '--accent-foreground': colors.accentForeground,
        '--destructive': "0 84.2% 60.2%", '--destructive-foreground': "0 0% 98%",
        '--border': colors.border, '--input': colors.input, '--ring': colors.ring,
    });

    const lightStyles = getStyleObject(lightColors) as React.CSSProperties;
    const darkStyles = getStyleObject(darkColors) as React.CSSProperties;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border" style={lightStyles}>
                <h4 className="font-semibold text-lg mb-2 text-foreground" style={{color: 'hsl(var(--foreground))'}}>Light Preview</h4>
                <div className="bg-background p-4 rounded-md space-y-2" style={{backgroundColor: 'hsl(var(--background))'}}>
                    <Button style={{backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))'}}>Primary</Button>
                    <Button style={{backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))'}}>Secondary</Button>
                    <Badge style={{backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))'}}>Accent</Badge>
                </div>
            </div>
            <div className="p-4 rounded-lg border" style={darkStyles}>
                <h4 className="font-semibold text-lg mb-2 text-foreground" style={{color: 'hsl(var(--foreground))'}}>Dark Preview</h4>
                <div className="bg-background p-4 rounded-md space-y-2" style={{backgroundColor: 'hsl(var(--background))'}}>
                    <Button style={{backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))'}}>Primary</Button>
                    <Button style={{backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))'}}>Secondary</Button>
                    <Badge style={{backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))'}}>Accent</Badge>
                </div>
            </div>
        </div>
    );
};


export default function ThemeManagementPage() {
  const { toast } = useToast();
  const { settings: generalSettings, isLoadingSettings, refreshGeneralSettings } = useGeneralSettings();
  
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | undefined>(undefined);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const formSchemaWithUniqueness = useMemo(() => {
    return themeFormSchema.refine((data) => {
        if (!data.id) {
            return !themes.some(t => t.name.toLowerCase() === data.name.toLowerCase());
        }
        return !themes
            .filter(t => t.id !== data.id)
            .some(t => t.name.toLowerCase() === data.name.toLowerCase());
    }, {
        message: "A theme with this name already exists.",
        path: ["name"],
    });
  }, [themes]);

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(formSchemaWithUniqueness),
    mode: 'onChange'
  });
  
  const watchedLightColors = form.watch("lightColors");
  const watchedDarkColors = form.watch("darkColors");

  const initializeState = useCallback((settings: InvoiceSetupSettings) => {
    try {
        const parsedThemes = settings.availableThemes ? JSON.parse(settings.availableThemes) : [PRESET_THEMES[0]];
        setThemes(parsedThemes);
        const currentActiveId = settings.activeThemeId || parsedThemes[0]?.id;
        setActiveThemeId(currentActiveId);
        
        const themeToEdit = parsedThemes.find((t: Theme) => t.id === currentActiveId) || parsedThemes[0];
        if (themeToEdit) {
          setEditingTheme(themeToEdit);
          form.reset(themeToEdit);
        }
    } catch (e) {
        console.error("Failed to parse themes from general settings:", e);
        const defaultTheme = PRESET_THEMES[0];
        setThemes([defaultTheme]);
        setActiveThemeId(defaultTheme.id);
        setEditingTheme(defaultTheme);
        form.reset(defaultTheme);
    }
  }, [form]);

  useEffect(() => {
    if (!isLoadingSettings && generalSettings.companyName) { 
        initializeState(generalSettings);
    }
  }, [generalSettings, isLoadingSettings, initializeState]);

  const handleSetEditingTheme = useCallback((theme: Theme) => {
    setEditingTheme(theme);
    form.reset(theme);
  }, [form]);

  const handleApplyPreset = useCallback((preset: Theme) => {
    const newName = `${preset.name} (Custom)`;
    const isNameTaken = themes.some(t => t.name.toLowerCase() === newName.toLowerCase());
    
    const newTheme: Theme = {
        id: crypto.randomUUID(),
        name: isNameTaken ? `${newName} ${Math.floor(Math.random()*100)}` : newName,
        lightColors: { ...preset.lightColors },
        darkColors: { ...preset.darkColors },
    };
    handleSetEditingTheme(newTheme);
    toast({ title: "Preset Loaded", description: `"${preset.name}" values loaded. You can now save it as a new theme.` });
  }, [themes, handleSetEditingTheme, toast]);

  const handleAddNewTheme = useCallback(() => {
    const newTheme = {
      id: crypto.randomUUID(),
      name: `Custom Theme ${themes.length + 1}`,
      lightColors: DEFAULT_LIGHT_THEME_COLORS,
      darkColors: DEFAULT_DARK_THEME_COLORS,
    };
    handleSetEditingTheme(newTheme);
  }, [themes.length, handleSetEditingTheme]);

  const saveAndApplyTheme = async (themeToSave: Theme) => {
      setIsSaving(true);
      
      let updatedThemesList;
      const isNewTheme = !themes.some(t => t.id === themeToSave.id);
      if (isNewTheme) {
        updatedThemesList = [...themes, themeToSave];
      } else {
        updatedThemesList = themes.map(t => (t.id === themeToSave.id ? themeToSave : t));
      }
      
      const settingsToSave: Partial<InvoiceSetupSettings> = {
          ...generalSettings,
          availableThemes: JSON.stringify(updatedThemesList),
          activeThemeId: themeToSave.id,
      };
      
      const saveGeneralResult = await saveGeneralSettingsAction(settingsToSave as InvoiceSetupSettings);
      
      if (saveGeneralResult.success) {
          const applyCssResult = await applyThemeToGlobalsCss(themeToSave);
          if (applyCssResult.success) {
              toast({ title: "Theme Saved & Applied", description: `Theme "${themeToSave.name}" applied successfully. A page refresh may be needed to see all changes.` });
              await refreshGeneralSettings();
          } else {
              toast({ title: "CSS Apply Error", description: applyCssResult.message, variant: "destructive" });
          }
      } else {
          toast({ title: "Error Saving Themes", description: saveGeneralResult.message, variant: "destructive" });
      }
      setIsSaving(false);
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
    
    const updatedThemes = themes.filter(t => t.id !== themeId);
    setThemes(updatedThemes);

    if (editingTheme?.id === themeId) { 
        const newEditingTheme = themes.find(t => t.id === activeThemeId) || updatedThemes[0];
        if (newEditingTheme) handleSetEditingTheme(newEditingTheme);
    }
    toast({ title: "Theme Deleted (Locally)", description: "Save all themes to make this permanent." });
  };


  const onSubmit = async (data: ThemeFormValues) => {
    if (!editingTheme) return;
    const themeToSave: Theme = {
      id: editingTheme.id,
      name: data.name,
      lightColors: data.lightColors,
      darkColors: data.darkColors,
    };
    await saveAndApplyTheme(themeToSave);
  };
  
  const handleSetActiveTheme = async (themeId: string) => {
    const themeToApply = themes.find(t => t.id === themeId);
    if (!themeToApply) {
        toast({ title: "Error", description: "Selected theme not found.", variant: "destructive"});
        return;
    }
    await saveAndApplyTheme(themeToApply);
  };

  const getBackgroundColor = (hslString: string) => {
    return hslRegex.test(hslString) ? `hsl(${hslString})` : 'transparent';
  };

  if (isLoadingSettings || !editingTheme) {
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
              <CardDescription>Start with a preset to create a new theme.</CardDescription>
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
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> :<CheckCircle className="h-4 w-4"/>}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSetEditingTheme(theme)} title="Edit">
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
                              <AlertDialogDescription>This action cannot be undone and will permanently delete this theme configuration.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTheme(theme.id)}>Delete Theme</AlertDialogAction>
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
                            Editing Theme:
                        </FormLabel>
                        <FormControl>
                            <Input id="themeNameInput" {...field} placeholder="e.g., Ocean Breeze, Dark Knight" className="text-lg font-semibold"/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}/>
                    <CardDescription>Define HSL color values (e.g., "210 40% 96%"). All fields are required.</CardDescription>
                </CardHeader>
                <ScrollArea className="max-h-[calc(100vh-20rem)] lg:max-h-[calc(100vh-25rem)]"> 
                <CardContent className="space-y-8 p-4 md:p-6">
                    {watchedLightColors && watchedDarkColors && <ThemePreviewPanel lightColors={watchedLightColors} darkColors={watchedDarkColors}/>}
                    <div>
                    <h3 className="text-lg font-semibold mb-3 text-accent border-b pb-1">Light Mode Colors</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        {PALETTE_FIELDS.map(colorKey => (
                        <FormField key={`light-${colorKey}`} control={form.control} name={`lightColors.${colorKey}`} render={({ field }) => (
                            <FormItem>
                            <FormLabel className="capitalize text-sm">{colorKey.replace(/([A-Z])/g, ' $1')}</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormControl><Input {...field} placeholder="H S% L%" className="h-9 text-sm"/></FormControl>
                                <div
                                    className="h-6 w-6 rounded-full border border-border"
                                    style={{ backgroundColor: getBackgroundColor(watchedLightColors?.[colorKey] || '') }}
                                />
                            </div>
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
                             <div className="flex items-center gap-2">
                                <FormControl><Input {...field} placeholder="H S% L%" className="h-9 text-sm"/></FormControl>
                                <div
                                    className="h-6 w-6 rounded-full border border-border"
                                    style={{ backgroundColor: getBackgroundColor(watchedDarkColors?.[colorKey] || '') }}
                                />
                            </div>
                            <FormMessage className="text-xs"/>
                            </FormItem>
                        )}/>
                        ))}
                    </div>
                    </div>
                </CardContent>
                </ScrollArea>
                <CardFooter className="pt-6 border-t">
                    <Button type="submit" className="w-full sm:w-auto" disabled={isSaving || !form.formState.isValid}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {themes.some(t => t.id === editingTheme?.id) ? 'Save & Apply Changes' : 'Save & Apply New Theme'}
                    </Button>
                </CardFooter>
              </form>
            </Form>
        </Card>
      </div>
    </div>
  );
}
