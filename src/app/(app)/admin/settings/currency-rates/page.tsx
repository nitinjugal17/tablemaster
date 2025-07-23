
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, DollarSign, Save, Info, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, useCallback } from "react";
import type { CurrencyCode, CurrencyOption } from "@/lib/types";
import { BASE_CURRENCY_CODE, currencyOptions } from "@/lib/types";
import { useCurrencyRates } from "@/context/CurrencyRatesContext"; // Import context hook
import { saveConversionRates as saveConversionRatesAction } from "@/app/actions/data-management-actions";


export default function CurrencyRatesPage() {
  const { toast } = useToast();
  // Use rates from context
  const { rates: globalRates, isLoadingRates: isLoadingContextRates, refreshRates } = useCurrencyRates(); 
  
  // editableRates is local state for the form, initialized from globalRates
  const [editableRates, setEditableRates] = useState<Partial<Record<CurrencyCode, number>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const getSymbolForCode = (code: CurrencyCode) => currencyOptions.find(opt => opt.code === code)?.symbol || code;

  // Initialize form state when globalRates are loaded or change
  useEffect(() => {
    if (!isLoadingContextRates && globalRates[BASE_CURRENCY_CODE]) {
      const initialEditableRates: Partial<Record<CurrencyCode, number>> = {};
      const baseRates = globalRates[BASE_CURRENCY_CODE]!;
      currencyOptions.forEach(option => {
        if (option.code !== BASE_CURRENCY_CODE) {
          initialEditableRates[option.code] = baseRates[option.code] || 0;
        }
      });
      setEditableRates(initialEditableRates);
    }
  }, [globalRates, isLoadingContextRates]);


  const handleRateChange = (targetCurrency: CurrencyCode, value: string) => {
    const numericValue = parseFloat(value);
    setEditableRates(prev => ({
      ...prev,
      [targetCurrency]: isNaN(numericValue) ? 0 : numericValue,
    }));
  };

  const handleSaveRates = async () => {
    setIsSaving(true);
    try {
      const result = await saveConversionRatesAction(editableRates);
      if (result.success) {
        toast({
          title: "Conversion Rates Saved to CSV",
          description: result.message,
        });
        await refreshRates(); // Refresh rates in context after saving
      } else {
        toast({ title: "Error Saving Rates", description: result.message, variant: "destructive" });
      }
    } catch (e) {
      console.error("Error saving conversion rates to CSV:", e);
      toast({ title: "Error Saving Rates", description: "Could not save conversion rates to CSV.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingContextRates) {
    return (
      <div className="space-y-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
            <DollarSign className="mr-3 h-7 w-7" /> Manage Currency Conversion Rates
          </h1>
          <p className="text-muted-foreground">Set exchange rates from the base currency ({BASE_CURRENCY_CODE}) to other supported currencies.</p>
        </div>
        <Card><CardContent className="p-6 text-center flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading rates...</CardContent></Card>
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
          <DollarSign className="mr-3 h-7 w-7" /> Manage Currency Conversion Rates
        </h1>
        <p className="text-muted-foreground">Set exchange rates from the base currency ({BASE_CURRENCY_CODE}) to other supported currencies. These rates are stored in a server-side CSV file.</p>
      </div>

      <Alert>
        <Info className="h-5 w-5" />
        <AlertTitle className="font-semibold">Base Currency: {BASE_CURRENCY_CODE} ({getSymbolForCode(BASE_CURRENCY_CODE)})</AlertTitle>
        <AlertDescription>
          All rates are defined as how much 1 unit of {BASE_CURRENCY_CODE} is worth in the target currency.
          For example, if 1 {BASE_CURRENCY_CODE} = 0.012 USD, enter 0.012 for USD.
        </AlertDescription>
      </Alert>
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">Edit Conversion Rates</CardTitle>
          <CardDescription>Define the value of 1 {BASE_CURRENCY_CODE} in other currencies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currencyOptions.map(option => {
            if (option.code === BASE_CURRENCY_CODE) {
              return (
                <div key={option.code} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                  <Label htmlFor={`rate-${option.code}`} className="md:col-span-1">
                    1 {BASE_CURRENCY_CODE} ({getSymbolForCode(BASE_CURRENCY_CODE)}) to {option.name}
                  </Label>
                  <div className="md:col-span-2">
                    <Input id={`rate-${option.code}`} type="number" value="1" readOnly disabled className="bg-muted/50"/>
                  </div>
                </div>
              );
            }
            return (
              <div key={option.code} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                <Label htmlFor={`rate-${option.code}`} className="md:col-span-1">
                  1 {BASE_CURRENCY_CODE} ({getSymbolForCode(BASE_CURRENCY_CODE)}) to {option.name}
                </Label>
                <div className="md:col-span-2">
                  <Input
                    id={`rate-${option.code}`}
                    type="number"
                    step="any"
                    value={editableRates[option.code] ?? ""} // Use ?? for robust undefined/null check
                    onChange={(e) => handleRateChange(option.code, e.target.value)}
                    placeholder={`Rate for ${option.code}`}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveRates} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
             Save Conversion Rates to CSV
            </Button>
        </CardFooter>
      </Card>

       <Alert variant="default" className="bg-sky-50 border-sky-300">
        <Info className="h-5 w-5 text-sky-600" />
        <AlertTitle className="font-semibold text-sky-700">Global Rates Now in CSV</AlertTitle>
        <AlertDescription className="text-sky-600">
            Conversion rates are now stored in a server-side CSV file and are accessible globally (frontend and backend).
            Changes saved here will reflect across the application after a brief refresh/load period.
        </AlertDescription>
      </Alert>
    </div>
  );
}
