// src/app/(app)/admin/settings/integrations/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { IntegrationSetting } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getIntegrationSettings, saveIntegrationSettings } from '@/app/actions/data-management-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Save, Loader2, Link as LinkIcon, Handshake, Bot } from 'lucide-react';

const integrationFormSchema = z.object({
  zomatoIsEnabled: z.boolean(),
  zomatoApiKey: z.string().optional(),
  swiggyIsEnabled: z.boolean(),
  swiggyApiKey: z.string().optional(),
});

type IntegrationFormValues = z.infer<typeof integrationFormSchema>;

export default function IntegrationsSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  const form = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      zomatoIsEnabled: false,
      zomatoApiKey: "",
      swiggyIsEnabled: false,
      swiggyApiKey: "",
    },
  });

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const settings = await getIntegrationSettings();
        const zomato = settings.find(s => s.platform === 'zomato');
        const swiggy = settings.find(s => s.platform === 'swiggy');
        
        form.reset({
          zomatoIsEnabled: zomato?.isEnabled || false,
          zomatoApiKey: zomato?.apiKey || "",
          swiggyIsEnabled: swiggy?.isEnabled || false,
          swiggyApiKey: swiggy?.apiKey || "",
        });
      } catch (error) {
        toast({ title: "Error", description: "Could not load integration settings.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();

    // Set webhook URL based on current host
    if (typeof window !== 'undefined') {
        setWebhookUrl(`${window.location.origin}/api/webhooks/delivery`);
    }

  }, [toast, form]);

  async function onSubmit(values: IntegrationFormValues) {
    setIsSaving(true);
    const settingsToSave: IntegrationSetting[] = [
      {
        id: 'zomato-settings',
        platform: 'zomato',
        isEnabled: values.zomatoIsEnabled,
        apiKey: values.zomatoApiKey,
      },
      {
        id: 'swiggy-settings',
        platform: 'swiggy',
        isEnabled: values.swiggyIsEnabled,
        apiKey: values.swiggyApiKey,
      },
    ];

    try {
      const result = await saveIntegrationSettings(settingsToSave);
      if (result.success) {
        toast({ title: "Settings Saved", description: "Your integration settings have been updated." });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center">
          <Handshake className="mr-3 h-7 w-7" /> Third-Party Integrations
        </h1>
        <p className="text-muted-foreground">Manage connections to services like Zomato and Swiggy.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center"><Bot className="mr-2"/>Zomato Integration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <FormField control={form.control} name="zomatoIsEnabled" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable Zomato</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
              )}/>
              <FormField control={form.control} name="zomatoApiKey" render={({ field }) => (
                <FormItem><FormLabel>Zomato API Key</FormLabel><FormControl><Input {...field} placeholder="Enter your Zomato API Key" disabled={!form.watch('zomatoIsEnabled')} /></FormControl><FormMessage /></FormItem>
              )}/>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center"><Bot className="mr-2"/>Swiggy Integration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               <FormField control={form.control} name="swiggyIsEnabled" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Enable Swiggy</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
              )}/>
              <FormField control={form.control} name="swiggyApiKey" render={({ field }) => (
                <FormItem><FormLabel>Swiggy API Key</FormLabel><FormControl><Input {...field} placeholder="Enter your Swiggy API Key" disabled={!form.watch('swiggyIsEnabled')} /></FormControl><FormMessage /></FormItem>
              )}/>
            </CardContent>
          </Card>

          <Alert>
            <LinkIcon className="h-4 w-4" />
            <AlertTitle>Webhook URL</AlertTitle>
            <AlertDescription>
              To receive real-time order updates, you must provide the following URL in your Zomato and Swiggy developer dashboards:
              <Input readOnly value={webhookUrl} className="mt-2 text-xs" />
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
              Save Integration Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
