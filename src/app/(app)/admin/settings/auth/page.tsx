
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, KeyRound, Smartphone, MailCheck, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AuthSettingsPage() {
  return (
    <div className="space-y-8">
        <Button variant="outline" asChild className="mb-4">
            <Link href="/admin/settings"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings</Link>
        </Button>
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">Authentication Settings</h1>
        <p className="text-muted-foreground">Configure OTP authentication for new user signups. Email OTP uses Nodemailer with server-side SMTP configuration.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><KeyRound className="mr-2 h-5 w-5 text-accent"/>OTP Authentication Configuration</CardTitle>
          <CardDescription>Manage settings for One-Time Password (OTP) via email or phone number.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="mt-4 p-6 bg-muted/50 rounded-lg space-y-4">
            <div>
                <h3 className="font-semibold mb-1 flex items-center"><MailCheck className="mr-2 h-4 w-4"/>Email OTP Settings:</h3>
                <ul className="list-disc list-inside text-sm space-y-1 pl-5">
                    <li>Enable Email OTP for Signup: <span className="text-green-600 font-semibold">Enabled</span></li>
                    <li>Email Service Provider: <span className="text-foreground">Nodemailer (via SMTP in .env)</span></li>
                    <li>OTP Email Template: <span className="text-foreground">Standard System Template</span></li>
                </ul>
            </div>
            <div>
                <h3 className="font-semibold mb-1 flex items-center"><Smartphone className="mr-2 h-4 w-4"/>Phone OTP Settings:</h3>
                <ul className="list-disc list-inside text-sm space-y-1 pl-5">
                    <li>Enable Phone OTP for Signup: <span className="text-red-600 font-semibold">Disabled (Not Implemented)</span></li>
                    <li>SMS Provider API Key (e.g., Twilio SID): <span className="text-foreground">Not Configured</span></li>
                    <li>SMS Provider Auth Token: <span className="text-foreground">Not Configured</span></li>
                    <li>"From" Phone Number: <span className="text-foreground">Not Configured</span></li>
                </ul>
            </div>
          </div>
           <Alert variant="default" className="mt-6 bg-sky-50 border-sky-300">
            <Info className="h-5 w-5 text-sky-600" />
            <AlertTitle className="font-semibold text-sky-700">SMTP Configuration for Email OTP</AlertTitle>
            <AlertDescription className="text-sky-600">
                Email OTP functionality relies on SMTP settings in your server's <code>.env</code> file (<code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, <code>EMAIL_FROM</code>). Ensure these are correctly configured.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
            <Button disabled>Save OTP Settings (Not Implemented via UI)</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
