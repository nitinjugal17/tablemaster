
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Gauge, AlertCircle, Info, Save, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import type { RateLimitConfig } from "@/lib/types";
import { defaultRateLimitConfig } from "@/lib/types";
import { getRateLimitConfig, saveRateLimitConfig } from "@/app/actions/data-management-actions";

const rateLimitFormSchema = z.object({
  otpRequestsPerHour: z.coerce.number().min(0, "Cannot be negative.").default(defaultRateLimitConfig.otpRequestsPerHour),
  otpRequestsPerDay: z.coerce.number().min(0, "Cannot be negative.").default(defaultRateLimitConfig.otpRequestsPerDay),
  signupAttemptsPerHour: z.coerce.number().min(0, "Cannot be negative.").default(defaultRateLimitConfig.signupAttemptsPerHour),
  signupAttemptsPerDay: z.coerce.number().min(0, "Cannot be negative.").default(defaultRateLimitConfig.signupAttemptsPerDay),
});

type RateLimitFormValues = z.infer<typeof rateLimitFormSchema>;

export default function RateLimitingSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<RateLimitFormValues>({
    resolver: zodResolver(rateLimitFormSchema),
    defaultValues: defaultRateLimitConfig,
  });

  useEffect(() => {
    async function fetchConfig() {
      setIsLoading(true);
      try {
        const config = await getRateLimitConfig();
        form.reset(config);
      } catch (error) {
        toast({ title: "Error", description: "Could not fetch rate limit configurations.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchConfig();
  }, [form, toast]);

  async function onSubmit(values: RateLimitFormValues) {
    setIsSaving(true);
    const result = await saveRateLimitConfig(values);
    if (result.success) {
      toast({ title: "Configuration Saved", description: "Rate limit settings have been updated." });
    } else {
      toast({ title: "Error Saving", description: result.message, variant: "destructive" });
    }
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading rate limit settings...</p>
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
          <Gauge className="mr-3 h-7 w-7" /> Rate Limiting Configuration
        </h1>
        <p className="text-muted-foreground">Configure server-side rate limits. These settings are stored in a CSV file.</p>
      </div>

      <Alert variant="default" className="bg-sky-50 border-sky-300">
        <Info className="h-5 w-5 text-sky-600" />
        <AlertTitle className="font-semibold text-sky-700">Counters Implementation Note</AlertTitle>
        <AlertDescription className="text-sky-600">
          While these limits are configurable and stored in CSV, the actual request *counters* for enforcing these limits are currently managed in-memory by the server. This means counters will reset on server restart and are not shared across multiple server instances. This is a prototype limitation.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-headline">Configure Rate Limits</CardTitle>
              <CardDescription>Set the maximum number of requests allowed for various actions within specified time windows.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="otpRequestsPerHour"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="otpRequestsPerHour">OTP Requests / Hour</Label>
                      <FormControl>
                        <Input id="otpRequestsPerHour" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground pt-1">Max OTP requests per identifier per hour.</p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="otpRequestsPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="otpRequestsPerDay">OTP Requests / Day</Label>
                      <FormControl>
                        <Input id="otpRequestsPerDay" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground pt-1">Max OTP requests per identifier per day.</p>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="signupAttemptsPerHour"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="signupAttemptsPerHour">Signup Attempts / Hour</Label>
                      <FormControl>
                        <Input id="signupAttemptsPerHour" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground pt-1">Max signup attempts per identifier per hour (conceptual).</p>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signupAttemptsPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="signupAttemptsPerDay">Signup Attempts / Day</Label>
                      <FormControl>
                        <Input id="signupAttemptsPerDay" type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                       <p className="text-xs text-muted-foreground pt-1">Max signup attempts per identifier per day (conceptual).</p>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Configuration
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Alert variant="destructive">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="font-semibold">Production Readiness</AlertTitle>
        <AlertDescription>
          For a production environment, a more robust rate-limiting solution with persistent, distributed counters (e.g., using Redis or a dedicated service) is strongly recommended.
        </AlertDescription>
      </Alert>
    </div>
  );
}
