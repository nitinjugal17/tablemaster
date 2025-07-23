
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateMenuItemDetails, GenerateMenuItemDetailsInput, GenerateMenuItemDetailsOutput } from "@/ai/flows/generate-menu-item-details";
import { updateMenuItemInfo, UpdateMenuItemInfoInput, UpdateMenuItemInfoOutput } from "@/ai/flows/update-menu-item-info";
import { generateNutritionalInfo, GenerateNutritionalInfoInput, GenerateNutritionalInfoOutput } from "@/ai/flows/generate-nutritional-info";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Sparkles, Wand2, RefreshCw, Loader2, FileEdit, Link as LinkIconLucide, PlusCircle, Trash2, DollarSign, Activity as ActivityIcon, BadgeDollarSign, Star, Zap, ShoppingBag } from "lucide-react";
import type { MenuItem as MenuItemType, StockItem, StockMenuMapping, StockUnit, MenuItemPortion, AddonGroup } from "@/lib/types";
import { BASE_CURRENCY_CODE, ALL_STOCK_UNITS } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { parsePortionDetails } from '@/lib/utils';


const portionDetailSchema = z.object({
  id: z.string().optional(), // for react-hook-form keying, not part of MenuItemPortion type directly
  name: z.string().min(1, "Portion name is required."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  isDefault: z.boolean().optional(),
});

const stockItemMappingSchema = z.object({
  id: z.string().optional(),
  stockItemId: z.string().min(1, "Stock item is required."),
  quantityUsedPerServing: z.coerce.number().min(0.001, "Quantity must be greater than 0."),
  unitUsed: z.enum(ALL_STOCK_UNITS, { required_error: "Unit used is required." }),
});

const menuItemSchemaBase = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  cuisine: z.string().min(3, "Cuisine type is required."),
  ingredients: z.string().min(10, "List key ingredients (e.g., chicken, tomatoes, basil)."),
  dietaryRestrictions: z.string().optional(),
  synonyms: z.string().optional().describe("Comma-separated list of alternative names for search."),
  sacCode: z.string().optional(), // New field for SAC/HSN code
});

// Zod preprocessor to transform empty strings to undefined for optional number fields
const emptyStringToUndefined = z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') return undefined;
    if (val === null) return undefined;
    return val;
}, z.coerce.number().optional());

const menuItemEditorSchema = menuItemSchemaBase.extend({
  id: z.preprocess((val) => (val ? String(val) : undefined), z.string().optional()),
  isAvailable: z.boolean().default(true),
  isSignatureDish: z.boolean().default(false),
  isTodaysSpecial: z.boolean().default(false),
  isMinibarItem: z.boolean().default(false),
  employeeBonusAmount: emptyStringToUndefined,
  portionDetails: z.array(portionDetailSchema).min(1, "At least one portion (e.g., 'fixed' or 'regular') must be defined.").default([{ name: "Regular", price: 0, isDefault: true, id: `new-pd-${Date.now()}` }]),
  category: z.string().min(1, "Category is required.").default("Uncategorized"),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  currentDescription: z.string().optional(),
  currentRecipe: z.string().optional(),
  currentPreparationMethod: z.string().optional(),
  updateInstructions: z.string().optional(),
  stockItemMappings: z.array(stockItemMappingSchema).optional().default([]),
  addonGroups: z.array(z.string()).optional(),
  calculatedCost: z.number().optional(), 
  // Make nutritional fields truly optional
  calories: emptyStringToUndefined,
  carbs: emptyStringToUndefined,
  protein: emptyStringToUndefined,
  fat: emptyStringToUndefined,
  energyKJ: emptyStringToUndefined,
  servingSizeSuggestion: z.string().optional(),
}).refine(data => {
    const defaultPortionsCount = data.portionDetails.filter(p => p.isDefault).length;
    if (defaultPortionsCount > 1) return false; // More than one default is not allowed
    if (data.portionDetails.length > 0 && defaultPortionsCount === 0) return false; // If there are portions, one must be default
    return true;
  }, {
    message: "Exactly one portion must be marked as default.",
    path: ["portionDetails"], 
  });


type MenuItemEditorValues = z.infer<typeof menuItemEditorSchema>;

interface MenuItemEditorProps {
  menuItem?: Partial<MenuItemType>;
  onSave: (menuItemData: Partial<MenuItemType>, mappingsData: StockMenuMapping[], originalId?: string) => void;
  allStockItems: StockItem[];
  allStockMenuMappings: StockMenuMapping[];
  allAddonGroups: AddonGroup[];
}

export function MenuItemEditor({ menuItem, onSave, allStockItems, allStockMenuMappings, allAddonGroups }: MenuItemEditorProps) {
  const { toast } = useToast();
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);

  const getInitialFormValues = useCallback((item?: Partial<MenuItemType>): MenuItemEditorValues => {
    const parsedPortions = parsePortionDetails(item?.portionDetails);
    
    let initialPortions = parsedPortions.length > 0 ? parsedPortions : [{ name: "Regular", price: 0, isDefault: true }];
    
    // Ensure there's exactly one default
    const defaultCount = initialPortions.filter(p => p.isDefault).length;
    if (defaultCount === 0 && initialPortions.length > 0) {
        initialPortions[0].isDefault = true;
    } else if (defaultCount > 1) {
        let firstDefaultFound = false;
        initialPortions = initialPortions.map(p => {
            if (p.isDefault && !firstDefaultFound) {
                firstDefaultFound = true;
                return p;
            }
            return { ...p, isDefault: false };
        });
    }

    const initialPortionsWithIds = initialPortions.map((p, idx) => ({ ...p, id: `pd-${item?.id || 'new'}-${idx}-${Date.now()}` }));
    const initialMappings = item?.id ? allStockMenuMappings.filter(m => m.menuItemId === item.id) : [];

    return {
        id: item?.id ? String(item.id) : "",
        name: item?.name || "",
        cuisine: item?.cuisine || "",
        ingredients: item?.ingredients || "",
        dietaryRestrictions: item?.dietaryRestrictions || "",
        synonyms: item?.synonyms || "",
        sacCode: item?.sacCode || "996331", // Default SAC for restaurant services
        isAvailable: item?.isAvailable === undefined ? true : item.isAvailable,
        isSignatureDish: item?.isSignatureDish || false,
        isTodaysSpecial: item?.isTodaysSpecial || false,
        isMinibarItem: item?.isMinibarItem || false,
        employeeBonusAmount: item?.employeeBonusAmount,
        portionDetails: initialPortionsWithIds,
        category: item?.category || "Uncategorized",
        imageUrl: item?.imageUrl || "",
        currentDescription: item?.description || "",
        currentRecipe: item?.recipe || "",
        currentPreparationMethod: item?.preparationMethod || "",
        stockItemMappings: initialMappings.map(m => ({ ...m })),
        addonGroups: item?.addonGroups || [],
        calculatedCost: item?.calculatedCost,
        calories: item?.calories,
        carbs: item?.carbs,
        protein: item?.protein,
        fat: item?.fat,
        energyKJ: item?.energyKJ,
        servingSizeSuggestion: item?.servingSizeSuggestion,
        updateInstructions: "",
    };
  }, [allStockMenuMappings]);

  const form = useForm<MenuItemEditorValues>({
    resolver: zodResolver(menuItemEditorSchema),
    defaultValues: getInitialFormValues(menuItem),
  });
  
  const { fields: portionFields, append: appendPortion, remove: removePortion, update: updatePortion } = useFieldArray({
    control: form.control,
    name: "portionDetails",
  });
  
  const { fields: mappingFields, append: appendMapping, remove: removeMapping } = useFieldArray({
    control: form.control,
    name: "stockItemMappings",
  });

  useEffect(() => {
    form.reset(getInitialFormValues(menuItem));
  }, [menuItem, form, getInitialFormValues]);

  const handleDefaultPortionChange = (selectedIndex: number) => {
    portionFields.forEach((field, index) => {
      updatePortion(index, { ...form.getValues(`portionDetails.${index}`), isDefault: index === selectedIndex });
    });
  };


  const handleGenerateDetails = async () => {
    const values = form.getValues();
    const input: GenerateMenuItemDetailsInput = {
      name: values.name,
      cuisine: values.cuisine,
      ingredients: values.ingredients,
      dietaryRestrictions: values.dietaryRestrictions,
    };

    const validation = menuItemSchemaBase.safeParse(input);
    if (!validation.success) {
        validation.error.errors.forEach(err => {
            form.setError(err.path[0] as keyof GenerateMenuItemDetailsInput, { message: err.message });
        });
        toast({ title: "Validation Error", description: "Please fill in Name, Cuisine, and Ingredients to generate details.", variant: "destructive" });
        return;
    }

    setIsGeneratingDetails(true);
    try {
      const result: GenerateMenuItemDetailsOutput = await generateMenuItemDetails(input);
      form.setValue("currentDescription", result.description);
      form.setValue("currentRecipe", result.recipe);
      form.setValue("currentPreparationMethod", result.preparationMethod);
      toast({ title: "AI Details Generated!", description: "Review and save the generated content." });
    } catch (error) {
      console.error("Error generating details:", error);
      toast({ title: "Error Generating Details", description: (error as Error).message || "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsGeneratingDetails(false);
    }
  };

  const handleUpdateInfo = async () => {
    const values = form.getValues();
    if (!values.updateInstructions) {
      form.setError("updateInstructions", { message: "Update instructions are required." });
      toast({ title: "Missing Information", description: "Please provide instructions for the AI to update the menu item.", variant: "destructive" });
      return;
    }
    if (!values.currentDescription && !values.currentRecipe && !values.currentPreparationMethod) {
        toast({ title: "Missing Information", description: "Please provide existing information or generate new details first.", variant: "destructive" });
        return;
    }

    const existingInformation = `Description: ${values.currentDescription || 'N/A'}\nRecipe: ${values.currentRecipe || 'N/A'}\nPreparation Method: ${values.currentPreparationMethod || 'N/A'}`;
    
    const input: UpdateMenuItemInfoInput = {
      menuItemName: values.name,
      existingInformation: existingInformation,
      updateInstructions: values.updateInstructions!,
    };

    setIsUpdatingInfo(true);
    try {
      const result: UpdateMenuItemInfoOutput = await updateMenuItemInfo(input);
      form.setValue("currentDescription", result.updatedInformation);
      form.setValue("currentRecipe", ""); 
      form.setValue("currentPreparationMethod", "");
      toast({ title: "AI Info Updated!", description: "Review the updated content." });
    } catch (error) {
      console.error("Error updating info:", error);
      toast({ title: "Error Updating Info", description: (error as Error).message || "An unknown error occurred.", variant: "destructive" });
    } finally {
      setIsUpdatingInfo(false);
    }
  };

  const handleGenerateNutrition = async () => {
    const values = form.getValues();
    const defaultPortionName = values.portionDetails.find(p=>p.isDefault)?.name || values.portionDetails[0]?.name || "1 standard serving";
    const input: GenerateNutritionalInfoInput = {
      menuItemName: values.name,
      ingredients: values.ingredients,
      recipe: values.currentRecipe,
      preparationMethod: values.currentPreparationMethod,
      portionSize: defaultPortionName,
    };

    const validation = menuItemSchemaBase.pick({ name: true, ingredients: true }).safeParse(input);
    if (!validation.success) {
        toast({ title: "Validation Error", description: "Name and Ingredients are required to generate nutritional info.", variant: "destructive" });
        return;
    }
    setIsGeneratingNutrition(true);
    try {
      const result = await generateNutritionalInfo(input);
      form.setValue("calories", result.calories);
      form.setValue("carbs", result.carbs);
      form.setValue("protein", result.protein);
      form.setValue("fat", result.fat);
      form.setValue("energyKJ", result.energyKJ);
      form.setValue("servingSizeSuggestion", result.servingSizeSuggestion);
      toast({ title: "Nutritional Info Generated!", description: "Review and save the estimated values for the default portion." });
    } catch (error) {
      console.error("Error generating nutritional info:", error);
      toast({ title: "Nutrition Gen Error", description: (error as Error).message || "Unknown error.", variant: "destructive" });
    } finally {
      setIsGeneratingNutrition(false);
    }
  };
  
  function onSubmit(data: MenuItemEditorValues) {
    const finalImageUrl = data.imageUrl && data.imageUrl.trim() !== ""
      ? data.imageUrl
      : `https://placehold.co/600x400.png?text=${encodeURIComponent(data.name || 'Item')}`;
    
    const menuItemIdForMappings = String(data.id || menuItem?.id || crypto.randomUUID()); 

    let finalPortionDetails = data.portionDetails.map(p => ({ name: p.name, price: p.price, isDefault: p.isDefault || false }));
    // Ensure there is exactly one default portion
    const defaultPortions = finalPortionDetails.filter(p => p.isDefault);
    if (defaultPortions.length === 0 && finalPortionDetails.length > 0) {
        finalPortionDetails[0].isDefault = true; 
    } else if (defaultPortions.length > 1) { 
        let firstDefaultFound = false;
        finalPortionDetails = finalPortionDetails.map(p => {
            if (p.isDefault && !firstDefaultFound) {
                firstDefaultFound = true;
                return p;
            }
            return { ...p, isDefault: false };
        });
    }

    const finalMenuItemData: Partial<MenuItemType> = {
        id: menuItemIdForMappings,
        name: data.name,
        cuisine: data.cuisine,
        ingredients: data.ingredients,
        dietaryRestrictions: data.dietaryRestrictions,
        synonyms: data.synonyms,
        sacCode: data.sacCode,
        description: data.currentDescription || "",
        recipe: data.currentRecipe || "",
        preparationMethod: data.currentPreparationMethod || "",
        isAvailable: data.isAvailable,
        isSignatureDish: data.isSignatureDish,
        isTodaysSpecial: data.isTodaysSpecial,
        isMinibarItem: data.isMinibarItem,
        employeeBonusAmount: data.employeeBonusAmount,
        portionDetails: JSON.stringify(finalPortionDetails), // Stringify the array
        category: data.category,
        imageUrl: finalImageUrl,
        aiHint: data.name.toLowerCase().split(' ').slice(0,2).join(' '),
        addonGroups: data.addonGroups,
        calculatedCost: data.calculatedCost,
        calories: data.calories || undefined,
        carbs: data.carbs || undefined,
        protein: data.protein || undefined,
        fat: data.fat || undefined,
        energyKJ: data.energyKJ || undefined,
        servingSizeSuggestion: data.servingSizeSuggestion || undefined,
    };

    const finalMappingsData: StockMenuMapping[] = (data.stockItemMappings || []).map(m => ({
        id: m.id || crypto.randomUUID(), 
        menuItemId: menuItemIdForMappings, 
        stockItemId: m.stockItemId,
        quantityUsedPerServing: m.quantityUsedPerServing,
        unitUsed: m.unitUsed,
    }));
    
    onSave(finalMenuItemData, finalMappingsData, menuItem?.id); 
    toast({ title: "Menu Item Data Ready", description: `${data.name} has been prepared. (Local change only)` });
  }

  return (
    <Card className="shadow-none border-0">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 px-1 py-4 sm:px-6 max-h-[calc(90vh-250px)] overflow-y-auto pr-3">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item ID</FormLabel>
                  <FormControl><Input placeholder="Auto-generates if new. Can be numeric or text." {...field} /></FormControl>
                  <FormDescription>Unique identifier for the menu item. Changing this for an existing item will create a new item and delete the old one upon saving.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., Spicy Tuna Roll" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sacCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HSN / SAC Code (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., 996331 for restaurant services" {...field} /></FormControl>
                  <FormDescription>Harmonized System of Nomenclature / Services Accounting Code for tax purposes.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Card className="bg-muted/30 p-4 space-y-4">
                <h3 className="font-semibold text-lg text-accent flex items-center">
                  <BadgeDollarSign className="mr-2 h-5 w-5"/> Portion Pricing
                </h3>
                <FormDescription>Define one or more portions for this item, each with its own name and price. Mark one as default.</FormDescription>
                <div className="space-y-3">
                {portionFields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-md bg-background space-y-3">
                        <div className="flex items-center justify-between">
                            <FormLabel className="text-sm font-medium">Portion #{index + 1}</FormLabel>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removePortion(index)} disabled={portionFields.length <= 1}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <FormField
                            control={form.control}
                            name={`portionDetails.${index}.name`}
                            render={({ field: nameField }) => (
                                <FormItem>
                                <FormLabel className="text-xs">Portion Name *</FormLabel>
                                <FormControl><Input placeholder="e.g., Regular, Large, Half" {...nameField} className="h-9 text-sm"/></FormControl>
                                <FormMessage className="text-xs"/>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`portionDetails.${index}.price`}
                            render={({ field: priceField }) => (
                               <FormItem>
                                <FormLabel className="text-xs">Price ({BASE_CURRENCY_CODE}) *</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="e.g., 10.99" {...priceField} className="h-9 text-sm"/></FormControl>
                                <FormMessage className="text-xs"/>
                              </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`portionDetails.${index}.isDefault`}
                            render={({ field: defaultField }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-1">
                                    <FormControl>
                                        <Checkbox
                                            checked={defaultField.value}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    handleDefaultPortionChange(index);
                                                } else {
                                                    // Prevent unchecking the last default one
                                                    const currentValues = form.getValues("portionDetails");
                                                    if (currentValues.filter(p => p.isDefault).length <= 1) {
                                                        toast({title: "Action Prohibited", description: "At least one portion must be set as default.", variant: "destructive"});
                                                    } else {
                                                        defaultField.onChange(false);
                                                    }
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="text-xs font-normal cursor-pointer">Set as Default Portion</FormLabel>
                                </FormItem>
                            )}
                        />
                    </div>
                ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => appendPortion({ name: `Portion ${portionFields.length + 1}`, price: 0, isDefault: false, id: `new-pd-${Date.now()}` })} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Another Portion
                </Button>
                 <FormField control={form.control} name="portionDetails" render={() => (<FormMessage className="mt-1 text-xs" />)} />
            </Card>

            <FormField
              control={form.control}
              name="calculatedCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <DollarSign className="mr-1 h-4 w-4 text-green-600" /> Calculated Cost for Default Portion ({BASE_CURRENCY_CODE})
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      value={typeof field.value === 'number' ? field.value.toFixed(2) : "N/A"}
                      readOnly 
                      className="bg-muted/50 cursor-not-allowed"
                      placeholder="N/A"
                    />
                  </FormControl>
                  <FormDescription>Auto-calculated after saving based on recipe and stock item prices. Updates on server save.</FormDescription>
                </FormItem>
              )}
            />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <FormControl><Input placeholder="e.g., Appetizer, Main Course" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="cuisine"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cuisine Type *</FormLabel>
                        <FormControl><Input placeholder="e.g., Japanese, Italian" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <div className="flex items-center gap-2">
                    <LinkIconLucide className="h-5 w-5 text-muted-foreground" />
                    <FormControl><Input type="url" placeholder="https://example.com/image.png or leave blank for default" {...field} /></FormControl>
                  </div>
                  <FormDescription>Direct URL to an image (AVIF, PNG, JPG, GIF, WebP) or video (MP4, WebM). If blank, a placeholder with item name will be used.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FormField
                  control={form.control}
                  name="isAvailable"
                  render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                          <FormLabel className="flex items-center text-sm"><Zap className="mr-2 h-4 w-4 text-green-500"/>Available</FormLabel>
                      </div>
                      <FormControl>
                          <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          />
                      </FormControl>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="isSignatureDish"
                  render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                          <FormLabel className="flex items-center text-sm"><Star className="mr-2 h-4 w-4 text-yellow-500"/>Signature</FormLabel>
                      </div>
                      <FormControl>
                          <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          />
                      </FormControl>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="isTodaysSpecial"
                  render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                          <FormLabel className="flex items-center text-sm"><Zap className="mr-2 h-4 w-4 text-orange-500"/>Special</FormLabel>
                      </div>
                      <FormControl>
                          <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          />
                      </FormControl>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="isMinibarItem"
                  render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                          <FormLabel className="flex items-center text-sm"><ShoppingBag className="mr-2 h-4 w-4 text-blue-500"/>Minibar</FormLabel>
                      </div>
                      <FormControl>
                          <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          />
                      </FormControl>
                      </FormItem>
                  )}
              />
            </div>
            
            <FormField
                control={form.control}
                name="employeeBonusAmount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Employee Bonus Amount ({BASE_CURRENCY_CODE}) (Optional)</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="e.g., 5.00" {...field} value={field.value ?? ''}/></FormControl>
                    <FormDescription>Specific bonus amount awarded to staff for selling this item.</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Ingredients *</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="e.g., Tuna, rice, avocado, nori, soy sauce" {...field} /></FormControl>
                  <FormDescription>Comma-separated list of key ingredients.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="synonyms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Synonyms / Alternative Names (Optional)</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="e.g., sushi roll, maki, spicy fish" {...field} /></FormControl>
                  <FormDescription>Comma-separated terms for better search.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dietaryRestrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietary Restrictions (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., Gluten-Free, Vegan" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="button" onClick={handleGenerateDetails} disabled={isGeneratingDetails} variant="outline" className="w-full md:w-auto">
              {isGeneratingDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              AI: Generate Description, Recipe, Prep Method
            </Button>

            <Card className="bg-muted/30 p-4 space-y-4">
                <h3 className="font-semibold text-lg text-accent flex items-center"><FileEdit className="mr-2 h-5 w-5"/>AI Generated/Editable Content:</h3>
                <FormField
                control={form.control}
                name="currentDescription"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={4} placeholder="AI-generated description..." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="currentRecipe"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Recipe</FormLabel>
                    <FormControl><Textarea rows={6} placeholder="AI-generated recipe..." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="currentPreparationMethod"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Preparation Method</FormLabel>
                    <FormControl><Textarea rows={4} placeholder="AI-generated preparation method..." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </Card>

            <FormField
              control={form.control}
              name="updateInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Update Instructions (Optional)</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="e.g., Make the description more formal..." {...field} /></FormControl>
                  <FormDescription>Tell the AI how to modify the content above.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" onClick={handleUpdateInfo} disabled={isUpdatingInfo} variant="outline" className="w-full md:w-auto">
              {isUpdatingInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              AI: Update Content Based on Instructions
            </Button>

            <Card className="bg-muted/30 p-4 space-y-4">
              <h3 className="font-semibold text-lg text-accent flex items-center"><ActivityIcon className="mr-2 h-5 w-5"/>Nutritional Information (AI Estimated for Default Portion)</h3>
              <Button type="button" onClick={handleGenerateNutrition} disabled={isGeneratingNutrition} variant="outline" className="w-full md:w-auto mb-4">
                {isGeneratingNutrition ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                AI: Generate Nutritional Info
              </Button>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="calories" render={({ field }) => (
                    <FormItem><FormLabel>Calories (kcal)</FormLabel><FormControl><Input type="number" placeholder="e.g., 350" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="carbs" render={({ field }) => (
                    <FormItem><FormLabel>Carbs (g)</FormLabel><FormControl><Input type="number" placeholder="e.g., 45" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="protein" render={({ field }) => (
                    <FormItem><FormLabel>Protein (g)</FormLabel><FormControl><Input type="number" placeholder="e.g., 20" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="fat" render={({ field }) => (
                    <FormItem><FormLabel>Fat (g)</FormLabel><FormControl><Input type="number" placeholder="e.g., 15" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="energyKJ" render={({ field }) => (
                    <FormItem><FormLabel>Energy (kJ)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1460" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="servingSizeSuggestion" render={({ field }) => (
                    <FormItem className="col-span-2 md:col-span-1"><FormLabel>Serving Size For Est.</FormLabel><FormControl><Input placeholder="e.g., per serving (200g)" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                )}/>
              </div>
            </Card>

             <FormField
                name="addonGroups"
                control={form.control}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Applicable Add-on Groups</FormLabel>
                        <div className="space-y-2 rounded-md border p-4">
                            {allAddonGroups.map((group) => (
                                <FormField
                                    key={group.id}
                                    control={form.control}
                                    name="addonGroups"
                                    render={({ field: checkboxField }) => {
                                        return (
                                            <FormItem
                                                key={group.id}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                            >
                                                <FormControl>
                                                    <Checkbox
                                                        checked={checkboxField.value?.includes(group.id)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                                ? checkboxField.onChange([...(checkboxField.value || []), group.id])
                                                                : checkboxField.onChange(
                                                                    checkboxField.value?.filter(
                                                                        (value) => value !== group.id
                                                                    )
                                                                );
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">{group.name}</FormLabel>
                                            </FormItem>
                                        );
                                    }}
                                />
                            ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <Card className="bg-muted/30 p-4 space-y-4">
              <h3 className="font-semibold text-lg text-accent flex items-center"><LinkIconLucide className="mr-2 h-5 w-5"/>Stock Item Mappings:</h3>
              <div className="space-y-3">
                {mappingFields.map((field, index) => (
                  <div key={field.id} className="p-2 border rounded-md bg-background grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                    <FormField
                      control={form.control}
                      name={`stockItemMappings.${index}.stockItemId`}
                      render={({ field: selectField }) => (
                        <FormItem className="sm:col-span-1">
                          <FormLabel className="text-xs">Stock Item</FormLabel>
                          <Select onValueChange={selectField.onChange} value={selectField.value} >
                            <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select stock item" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {allStockItems.map(si => <SelectItem key={si.id} value={si.id} className="text-xs">{si.name} ({si.unit})</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name={`stockItemMappings.${index}.quantityUsedPerServing`}
                      render={({ field: quantityField }) => (
                        <FormItem className="sm:w-24">
                          <FormLabel className="text-xs">Qty Used</FormLabel>
                          <FormControl><Input type="number" step="any" {...quantityField} className="h-8 text-xs"/></FormControl>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`stockItemMappings.${index}.unitUsed`}
                      render={({ field: unitField }) => (
                        <FormItem className="sm:w-28">
                          <FormLabel className="text-xs">Unit</FormLabel>
                           <Select onValueChange={unitField.onChange} value={unitField.value}>
                            <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unit" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {ALL_STOCK_UNITS.map(u => <SelectItem key={u} value={u} className="text-xs capitalize">{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs"/>
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive self-end" onClick={() => removeMapping(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendMapping({ stockItemId: "", quantityUsedPerServing: 1, unitUsed: ALL_STOCK_UNITS[0] })}
                className="mt-2"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Stock Item Mapping
              </Button>
               <FormField
                control={form.control}
                name="stockItemMappings"
                render={() => <FormMessage className="mt-0 pt-0" />} 
              />
            </Card>

          </CardContent>
          <CardFooter className="px-1 py-4 sm:px-6 border-t mt-4">
            <Button type="submit" className="w-full" disabled={isGeneratingDetails || isUpdatingInfo || isGeneratingNutrition}>
                {menuItem?.id ? "Save Changes" : "Add Item to Menu (Locally)"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
