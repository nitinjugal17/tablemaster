
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Save, Star, DollarSign, Info, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import { useGeneralSettings } from "@/context/GeneralSettingsContext";
import { saveGeneralSettings as saveGeneralSettingsAction } from "@/app/actions/data-management-actions";
import type { InvoiceSetupSettings } from "@/lib/types";
import { BASE_CURRENCY_CODE } from "@/lib/types";

export default function LoyaltySettingsPage() {
  const { toast } = useToast();
  const { settings: loadedSettings, isLoadingSettings, refreshGeneralSettings } = useGeneralSettings();
  
  const [formSettings, setFormSettings] = useState<Partial<InvoiceSetupSettings>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoadingSettings) {
      setFormSettings({
        loyaltyProgramEnabled: loadedSettings.loyaltyProgramEnabled ?? false,
        pointsPerCurrencyUnit: loadedSettings.pointsPerCurrencyUnit ?? 1,
        pointValueInCurrency: loadedSettings.pointValueInCurrency ?? 0.1,
      });
    }
  }, [loadedSettings, isLoadingSettings]);

  const handleInputChange = (field: keyof typeof formSettings, value: string | boolean | number) => {
    setFormSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const settingsToSave = { ...loadedSettings, ...formSettings };
    try {
      const result = await saveGeneralSettingsAction(settingsToSave);
      if (result.success) {
        toast({
          title: "Loyalty Settings Saved",
          description: "Your loyalty program settings have been updated.",
        });
        await refreshGeneralSettings();
      } else {
        toast({ title: "Error Saving Settings", description: result.message, variant: "destructive" });
      }
    } catch (e) {
      console.error("Error saving loyalty settings:", e);
      toast({ title: "Error", description: "Could not save loyalty settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="flex justify-center items-center py-16">
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
          <Star className="mr-3 h-7 w-7" /> Loyalty Program Settings
        </h1>
        <p className="text-muted-foreground">Configure the customer loyalty and reward points system.</p>
      </div>
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Program Configuration</CardTitle>
          <CardDescription>Enable the loyalty program and define how points are earned and redeemed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="enable-loyalty" className="text-base font-semibold">Enable Loyalty Program</Label>
              <p className="text-sm text-muted-foreground">
                Turn the entire customer loyalty points system on or off.
              </p>
            </div>
            <Switch
              id="enable-loyalty"
              checked={formSettings.loyaltyProgramEnabled}
              onCheckedChange={(val) => handleInputChange('loyaltyProgramEnabled', val)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div>
              <Label htmlFor="points-per-unit">Points Earned per {BASE_CURRENCY_CODE}</Label>
              <Input
                id="points-per-unit"
                type="number"
                step="0.1"
                min="0"
                value={formSettings.pointsPerCurrencyUnit || ""}
                onChange={(e) => handleInputChange('pointsPerCurrencyUnit', Number(e.target.value))}
                placeholder="e.g., 1"
                disabled={!formSettings.loyaltyProgramEnabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many points a customer earns for each unit of {BASE_CURRENCY_CODE} spent.
              </p>
            </div>
            <div>
              <Label htmlFor="point-value">Value of 1 Point (in {BASE_CURRENCY_CODE})</Label>
              <Input
                id="point-value"
                type="number"
                step="0.01"
                min="0"
                value={formSettings.pointValueInCurrency || ""}
                onChange={(e) => handleInputChange('pointValueInCurrency', Number(e.target.value))}
                placeholder="e.g., 0.10"
                disabled={!formSettings.loyaltyProgramEnabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The monetary value of a single point when redeemed.
              </p>
            </div>
          </div>
          
          <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertTitle>How it Works</AlertTitle>
            <AlertDescription>
              Points are automatically awarded to registered users when an order is marked as "Completed".
              The ability for customers to redeem points during checkout is a feature for future implementation.
            </AlertDescription>
          </Alert>

        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Loyalty Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
