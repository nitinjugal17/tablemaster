
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Mail, Bell, Info, Save, Loader2, CalendarCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import type { NotificationSettings } from "@/lib/types";
import { defaultNotificationSettings } from "@/lib/types";
import { getNotificationSettings, saveNotificationSettings } from "@/app/actions/data-management-actions";

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [adminEmailForNotifications, setAdminEmailForNotifications] = useState("Loading...");

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const fetchedSettings = await getNotificationSettings();
        setSettings(fetchedSettings);
      } catch (error) {
        toast({
          title: "Error loading settings",
          description: "Could not fetch notification settings. Using defaults.",
          variant: "destructive",
        });
        setSettings(defaultNotificationSettings);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
    setAdminEmailForNotifications(process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS || "admin@yourdomain.com (from .env)");
  }, [toast]);

  const handleAdminSettingChange = (key: keyof NotificationSettings['admin'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      admin: { ...prev.admin, [key]: value },
    }));
  };

  const handleUserSettingChange = (key: keyof NotificationSettings['user'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      user: { ...prev.user, [key]: value },
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const result = await saveNotificationSettings(settings);
      if (result.success) {
        toast({ title: "Settings Saved", description: result.message });
      } else {
        toast({ title: "Error Saving Settings", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error Saving Settings", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading notification settings...</p>
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
        <h1 className="text-3xl font-headline font-bold text-primary">Notification Settings</h1>
        <p className="text-muted-foreground">Manage email notifications for admins and users. Settings are stored server-side. Email sending uses Nodemailer with server-side SMTP configuration.</p>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Mail className="mr-2 h-5 w-5 text-accent"/>Admin Notifications</CardTitle>
          <CardDescription>Configure email notifications sent to administrators. Admin email for receiving these is set in <code>.env</code>.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="adminNewOrder" className="flex flex-col space-y-1">
              <span>Notify on New Order</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Send an email to {adminEmailForNotifications} when a new order is placed.
              </span>
            </Label>
            <Switch id="adminNewOrder" checked={settings.admin.notifyOnNewOrder} onCheckedChange={(val) => handleAdminSettingChange('notifyOnNewOrder', val)} />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="adminNewBooking" className="flex flex-col space-y-1">
              <span>Notify on New Booking</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Send an email when a new table booking is made.
              </span>
            </Label>
            <Switch id="adminNewBooking" checked={settings.admin.notifyOnNewBooking} onCheckedChange={(val) => handleAdminSettingChange('notifyOnNewBooking', val)} />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="adminNewUser" className="flex flex-col space-y-1">
              <span>Notify on New User Signup</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Send an email when a new user signs up.
              </span>
            </Label>
            <Switch id="adminNewUser" checked={settings.admin.notifyOnNewUserSignup} onCheckedChange={(val) => handleAdminSettingChange('notifyOnNewUserSignup', val)} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><Bell className="mr-2 h-5 w-5 text-accent"/>User Notifications</CardTitle>
          <CardDescription>Configure email notifications sent to users for their activities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="userOrderConfirmation" className="flex flex-col space-y-1">
              <span>Email on Order Confirmation</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Send an email to the customer when their order is successfully placed.
              </span>
            </Label>
            <Switch id="userOrderConfirmation" checked={settings.user.emailOnOrderConfirmation} onCheckedChange={(val) => handleUserSettingChange('emailOnOrderConfirmation', val)} />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="userBookingConfirmation" className="flex flex-col space-y-1">
              <span className="flex items-center"><CalendarCheck className="mr-1.5 h-4 w-4 text-green-600"/>Email on Booking Request</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Send an email to the customer when their booking request is initially received.
              </span>
            </Label>
            <Switch id="userBookingConfirmation" checked={settings.user.emailOnBookingConfirmation} onCheckedChange={(val) => handleUserSettingChange('emailOnBookingConfirmation', val)} />
          </div>
           <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="userBookingStatusUpdate" className="flex flex-col space-y-1">
              <span className="flex items-center"><CalendarCheck className="mr-1.5 h-4 w-4 text-blue-600"/>Email on Booking Status Update</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Notify user when their booking is confirmed or cancelled by admin.
              </span>
            </Label>
            <Switch id="userBookingStatusUpdate" checked={settings.user.emailOnBookingStatusUpdate} onCheckedChange={(val) => handleUserSettingChange('emailOnBookingStatusUpdate', val)} />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="userOrderStatusUpdate" className="flex flex-col space-y-1">
              <span>Email on Order Status Update</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Notify user when their order status (e.g., Preparing, Ready) changes.
              </span>
            </Label>
            <Switch id="userOrderStatusUpdate" checked={settings.user.emailOnOrderStatusUpdate} onCheckedChange={(val) => handleUserSettingChange('emailOnOrderStatusUpdate', val)} />
          </div>
           <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="userOrderCompletion" className="flex flex-col space-y-1">
              <span>Email on Order Completion</span>
              <span className="font-normal leading-snug text-muted-foreground text-xs">
                Notify user when their order is marked as completed.
              </span>
            </Label>
            <Switch id="userOrderCompletion" checked={settings.user.emailOnOrderCompletion} onCheckedChange={(val) => handleUserSettingChange('emailOnOrderCompletion', val)} />
          </div>
        </CardContent>
      </Card>
       <Alert variant="default" className="bg-sky-50 border-sky-300">
            <Info className="h-5 w-5 text-sky-600" />
            <AlertTitle className="font-semibold text-sky-700">SMTP Configuration for All Emails</AlertTitle>
            <AlertDescription className="text-sky-600">
                All email functionalities (admin notifications, user order updates, OTPs) rely on SMTP settings in your server's <code>.env</code> file. Ensure <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>, and <code>EMAIL_FROM</code> are correctly configured.
            </AlertDescription>
        </Alert>
        <CardFooter className="flex justify-end mt-6">
            <Button onClick={handleSaveSettings} disabled={isSaving || isLoading}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Notification Settings
            </Button>
        </CardFooter>
    </div>
  );
}

