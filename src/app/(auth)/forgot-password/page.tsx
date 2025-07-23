
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MailCheck, ArrowLeft, Loader2, RefreshCcw } from "lucide-react";
import React from "react";
import { sendPasswordResetOtp } from "@/app/actions/auth-actions";
import { addClientLogEntry } from "@/app/actions/logging-actions";
import { useTranslation } from 'react-i18next'; // Import useTranslation

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const RESEND_COOLDOWN_SECONDS_FP = 60;

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth'); // Use 'auth' namespace
  const { toast } = useToast();
  const router = useRouter();
  const [isSending, setIsSending] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [otpSentInitialAttempt, setOtpSentInitialAttempt] = React.useState(false);
  const [emailForResend, setEmailForResend] = React.useState("");

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsSending(true);
    addClientLogEntry('User attempting to send password reset OTP.', 'INFO', { email: values.email });
    const result = await sendPasswordResetOtp(values.email);
    if (result.success) {
      let toastDescription = t('otpSentDescription', { email: values.email });
      if (result.messageId === 'mock_otp_console_log') {
        toastDescription = result.message || toastDescription; 
         toast({
            title: t('otpGeneratedDevTitle'),
            description: toastDescription,
            variant: "default",
            duration: 10000,
        });
      } else {
         toast({
            title: t('otpSentTitle'),
            description: toastDescription,
        });
      }
      addClientLogEntry('Password reset OTP sent/generated successfully.', 'INFO', { email: values.email, messageId: result.messageId });
      setOtpSentInitialAttempt(true);
      setEmailForResend(values.email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS_FP); 
      router.push(`/reset-password?email=${encodeURIComponent(values.email)}`);
    } else {
      toast({
        title: t('otpFailedTitle'),
        description: result.message,
        variant: "destructive",
      });
      addClientLogEntry('Failed to send password reset OTP.', 'ERROR', { email: values.email, error: result.message });
    }
    setIsSending(false);
  }

  async function handleResendOtp() {
    if (!emailForResend || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    addClientLogEntry('User requesting resend of password reset OTP.', 'INFO', { email: emailForResend });
    const result = await sendPasswordResetOtp(emailForResend);

    if (result.success) {
      let toastDescription = t('otpSentDescription', { email: emailForResend });
       if (result.messageId === 'mock_otp_console_log' && result.message?.includes("OTP:")) {
         toastDescription = result.message || toastDescription;
         toast({
            title: t('newOtpGeneratedDevTitle'),
            description: toastDescription,
            variant: "default",
            duration: 10000,
        });
      } else {
         toast({
            title: t('newOtpSentTitle'),
            description: toastDescription,
        });
      }
      addClientLogEntry('Password reset OTP resend successful.', 'INFO', { email: emailForResend, messageId: result.messageId });
    } else {
      toast({
        title: t('resendFailedTitle'),
        description: result.message || "Could not resend OTP at this time.",
        variant: "destructive",
      });
      addClientLogEntry('Password reset OTP resend failed.', 'ERROR', { email: emailForResend, error: result.message });
    }
    setResendCooldown(RESEND_COOLDOWN_SECONDS_FP);
    setIsResending(false);
  }


  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-primary">{t('forgotPasswordTitle')}</CardTitle>
        <CardDescription>{t('forgotPasswordDescription')}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('emailAddressLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('emailPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSending || isResending}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4" />}
              {t('sendOtpButton')}
            </Button>
            {otpSentInitialAttempt && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleResendOtp} 
                disabled={isResending || resendCooldown > 0}
              >
                {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                {resendCooldown > 0 ? t('resendOtpCooldownButton', { cooldown: resendCooldown }) : t('resendOtpButton')}
              </Button>
            )}
            <Button variant="link" asChild className="p-0 text-primary">
              <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> {t('backToLoginLink')}</Link>
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
