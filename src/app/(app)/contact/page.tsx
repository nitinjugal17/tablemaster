
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Loader2, Info } from "lucide-react";
import React from "react";
import { sendContactFormEmail } from "@/app/actions/contact-actions";
import { addClientLogEntry } from "@/app/actions/logging-actions"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGeneralSettings } from "@/context/GeneralSettingsContext";
import { useTranslation } from 'react-i18next';

const contactFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  subject: z.string().optional(),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }).max(2000, { message: "Message cannot exceed 2000 characters." }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const { settings: generalSettings, isLoadingSettings } = useGeneralSettings();
  const [isSending, setIsSending] = React.useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  async function onSubmit(values: ContactFormValues) {
    setIsSending(true);
    addClientLogEntry('User attempting to send contact form message.', 'INFO', { name: values.name, email: values.email, subject: values.subject });
    const result = await sendContactFormEmail(values);
    if (result.success) {
      toast({
        title: t('success'),
        description: t('contactFormSuccessMessage', "Thank you for contacting us. We'll get back to you shortly."),
      });
      addClientLogEntry('Contact form message sent successfully.', 'INFO', { name: values.name, email: values.email });
      form.reset();
    } else {
      toast({
        title: t('error'),
        description: result.message,
        variant: "destructive",
      });
      addClientLogEntry('Failed to send contact form message.', 'ERROR', { name: values.name, email: values.email, error: result.message });
    }
    setIsSending(false);
  }
  
  const supportEmail = generalSettings?.footerContactEmail || process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS || t('contactFormDefaultAdminEmail', "the admin (email not fully configured)");


  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full shadow-xl">
        <CardHeader className="text-center">
          <Mail className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="font-headline text-3xl md:text-4xl text-primary">{t('contactUsTitle')}</CardTitle>
          <CardDescription className="text-md md:text-lg">
            {t('contactUsDescription')}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('yourNameLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('yourNamePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('yourEmailLabel')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t('yourEmailPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('subjectLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('subjectPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('yourMessageLabel')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('yourMessagePlaceholder')} {...field} rows={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <Alert variant="default" className="bg-sky-50 border-sky-300">
                <Info className="h-5 w-5 text-sky-600" />
                <AlertTitle className="font-semibold text-sky-700">{t('contactFormInfoTitle')}</AlertTitle>
                <AlertDescription className="text-sky-600 text-xs">
                  {t('contactFormInfoDescription', { adminEmail: isLoadingSettings ? t('loading') : supportEmail })}
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg" disabled={isSending || isLoadingSettings}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSending ? t('sendingMessageButton') : t('sendMessageButton')}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
