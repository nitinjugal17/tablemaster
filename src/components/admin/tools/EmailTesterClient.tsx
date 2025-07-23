// src/components/admin/tools/EmailTesterClient.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Send, Loader2, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { sendTestEmailAction } from '@/app/actions/email-tester-actions';

const emailTesterSchema = z.object({
  recipientEmail: z.string().email("Please enter a valid email address."),
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Email body is required."),
});

type EmailTesterFormValues = z.infer<typeof emailTesterSchema>;

interface EmailTesterClientProps {
  adminEmail: string;
}

interface TestResult {
    success: boolean;
    message: string;
    details: Record<string, any>;
}

export const EmailTesterClient: React.FC<EmailTesterClientProps> = ({ adminEmail }) => {
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  const form = useForm<EmailTesterFormValues>({
    resolver: zodResolver(emailTesterSchema),
    defaultValues: {
      recipientEmail: adminEmail,
      subject: "TableMaster - Test Email",
      body: "This is a test email to verify the SMTP configuration.",
    },
  });

  async function onSubmit(values: EmailTesterFormValues) {
    setIsSending(true);
    setLastResult(null);
    const result = await sendTestEmailAction(values);
    setLastResult(result);
    setIsSending(false);
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" asChild className="mb-4">
        <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">Email (SMTP) Configuration Tester</h1>
        <p className="text-muted-foreground">Verify your email sending functionality and debug SMTP issues.</p>
      </div>

      <Alert variant="default" className="bg-sky-50 border-sky-300">
        <Info className="h-5 w-5 text-sky-600" />
        <AlertTitle className="font-semibold text-sky-700">How It Works</AlertTitle>
        <AlertDescription className="text-sky-600">
          This tool uses the server's configured SMTP credentials from your <code>.env</code> file to send an email. 
          If successful, it means your SMTP host, port, user, and password are correct. If it fails, the detailed log below will provide the server's response.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="recipientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Email *</FormLabel>
                    <FormControl><Input type="email" placeholder="recipient@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject *</FormLabel>
                    <FormControl><Input placeholder="Test Email Subject" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Body *</FormLabel>
                    <FormControl><Textarea placeholder="This is the email body..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSending ? "Sending Test..." : "Send Test Email"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {lastResult.success ? <CheckCircle className="mr-2 h-5 w-5 text-green-600" /> : <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />}
              Test Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant={lastResult.success ? "default" : "destructive"} className={lastResult.success ? "bg-green-50 border-green-300 text-green-800" : ""}>
                <AlertTitle className="font-semibold">
                    {lastResult.success ? "Success" : "Failure"}
                </AlertTitle>
                <AlertDescription className="font-medium">{lastResult.message}</AlertDescription>
            </Alert>
            <div className="mt-4">
                <Label>Server Response Details:</Label>
                <pre className="mt-1 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
                    <code>{JSON.stringify(lastResult.details, null, 2)}</code>
                </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
