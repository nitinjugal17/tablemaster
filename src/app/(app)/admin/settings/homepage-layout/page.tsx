
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { saveGeneralSettings as saveGeneralSettingsAction } from '@/app/actions/data-management-actions';
import type { HomepageSectionConfig, HomepageSectionId } from '@/lib/types';
import { DEFAULT_HOMEPAGE_LAYOUT } from '@/lib/types';
import { ArrowLeft, Save, Loader2, LayoutGrid, Eye, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"; // Added Form import

// Mock current user role - adjust this for actual role checking
const MOCK_CURRENT_USER_ROLE = 'superadmin';

const homepageSectionConfigSchema = z.object({
  id: z.string() as z.ZodType<HomepageSectionId>,
  name: z.string(),
  isVisible: z.boolean(),
  order: z.coerce.number().min(0, "Order must be non-negative"),
});

const homepageLayoutFormSchema = z.object({
  sections: z.array(homepageSectionConfigSchema),
});

type HomepageLayoutFormValues = z.infer<typeof homepageLayoutFormSchema>;

export default function HomepageLayoutPage() {
  const { toast } = useToast();
  const { settings: generalSettings, isLoadingSettings, refreshGeneralSettings } = useGeneralSettings();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<HomepageLayoutFormValues>({
    resolver: zodResolver(homepageLayoutFormSchema),
    defaultValues: { sections: [] }, // Will be populated by useEffect
  });

  const { fields, update, move } = useFieldArray({
    control: form.control,
    name: "sections",
  });

  useEffect(() => {
    if (!isLoadingSettings && generalSettings.homepageLayoutConfig) {
      try {
        const parsedLayout = JSON.parse(generalSettings.homepageLayoutConfig) as HomepageSectionConfig[];
        const mergedLayout = DEFAULT_HOMEPAGE_LAYOUT.map(defaultSection => {
          const storedSection = parsedLayout.find(s => s.id === defaultSection.id);
          return { 
            ...defaultSection, 
            ...(storedSection || {}), 
            isVisible: storedSection ? storedSection.isVisible : defaultSection.isVisible,
            order: storedSection ? storedSection.order : defaultSection.order,
            name: defaultSection.name // Always use default name for display
          };
        }).sort((a,b) => a.order - b.order);
        form.reset({ sections: mergedLayout });
      } catch (e) {
        console.error("Failed to parse homepageLayoutConfig, using default:", e);
        form.reset({ sections: [...DEFAULT_HOMEPAGE_LAYOUT].sort((a,b) => a.order - b.order) });
      }
    } else if (!isLoadingSettings && !generalSettings.homepageLayoutConfig) {
        form.reset({ sections: [...DEFAULT_HOMEPAGE_LAYOUT].sort((a,b) => a.order - b.order) });
    }
  }, [generalSettings, isLoadingSettings, form]);
  

  const onSubmit = async (data: HomepageLayoutFormValues) => {
    setIsSaving(true);
    // Re-normalize order before saving to ensure it's sequential and starts from 1
    const sectionsToSave = data.sections
      .sort((a, b) => a.order - b.order)
      .map((sec, idx) => ({ ...sec, order: idx + 1 }));
      
    const newLayoutConfig = JSON.stringify(sectionsToSave);
    
    try {
      const updatedSettings = { ...generalSettings, homepageLayoutConfig: newLayoutConfig };
      const result = await saveGeneralSettingsAction(updatedSettings);
      if (result.success) {
        toast({ title: "Layout Saved", description: "Homepage layout configuration has been updated." });
        await refreshGeneralSettings();
      } else {
        toast({ title: "Error Saving Layout", description: result.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Could not save homepage layout.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const currentSections = form.getValues("sections");
    const sectionToMove = currentSections[index];
    const targetSection = currentSections[newIndex];

    // Swap orders
    const tempOrder = sectionToMove.order;
    sectionToMove.order = targetSection.order;
    targetSection.order = tempOrder;
    
    // Create new array with swapped elements for react-hook-form's move
    const newArray = [...currentSections];
    newArray[index] = targetSection;
    newArray[newIndex] = sectionToMove;

    // Normalize orders after move to ensure they are sequential for sorting
    const sortedAndNormalized = newArray
        .sort((a, b) => a.order - b.order)
        .map((sec, idx) => ({ ...sec, order: idx + 1 }));

    form.setValue("sections", sortedAndNormalized, { shouldDirty: true });
  };


  if (MOCK_CURRENT_USER_ROLE !== 'superadmin') {
    return (
      <div className="space-y-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to configure the homepage layout.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingSettings) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
          <LayoutGrid className="mr-3 h-7 w-7" /> Homepage Layout Configuration
        </h1>
        <p className="text-muted-foreground">Control the visibility and order of sections on your public homepage. Saved to general settings.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Manage Homepage Sections</CardTitle>
          <CardDescription>
            Toggle visibility and set the display order. Lower numbers appear higher on the page.
            Use the up/down arrows to re-arrange sections, then save.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-muted/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3 flex-grow">
                        {/* <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab opacity-50" /> */}
                        <h3 className="font-semibold text-lg text-foreground">{field.name}</h3>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                      <FormField
                        control={form.control}
                        name={`sections.${index}.isVisible`}
                        render={({ field: switchField }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl><Switch checked={switchField.value} onCheckedChange={switchField.onChange} id={`isVisible-${field.id}`} /></FormControl>
                            <Label htmlFor={`isVisible-${field.id}`} className="text-sm">Visible</Label>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`sections.${index}.order`}
                        render={({ field: orderField }) => (
                          <FormItem className="flex items-center space-x-2">
                            <Label htmlFor={`order-${field.id}`} className="text-sm">Order</Label>
                            <FormControl><Input type="number" {...orderField} className="w-20 h-9" /></FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-1">
                         <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => handleMoveSection(index, 'up')} disabled={index === 0 || fields.find(f => f.order === field.order -1) === undefined}>
                            <ArrowUp className="h-4 w-4" />
                            <span className="sr-only">Move Up</span>
                        </Button>
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => handleMoveSection(index, 'down')} disabled={index === fields.length - 1 || fields.find(f => f.order === field.order + 1) === undefined}>
                            <ArrowDown className="h-4 w-4" />
                            <span className="sr-only">Move Down</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={() => window.open('/', '_blank')} >
                <Eye className="mr-2 h-4 w-4" /> Preview Homepage (New Tab)
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Layout
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
