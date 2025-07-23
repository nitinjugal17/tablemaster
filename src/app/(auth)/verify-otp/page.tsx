
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
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
import { KeyRound, Loader2, ArrowLeft, ShieldAlert, MailCheck, RefreshCcw } from "lucide-react";
import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifySignupOtpAndActivateUser, resendSignupOtp } from "@/app/actions/auth-actions"; 
import { addClientLogEntry } from "@/app/actions/logging-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { placePublicTakeawayOrder } from "@/app/actions/order-actions";
import { saveNewBooking } from "@/app/actions/booking-actions";
import type { OrderItem, Booking, Order, User } from "@/lib/types";
import { useAuth } from "@/context/AuthContext"; 
import { useTranslation } from 'react-i18next';

const PENDING_TAKEAWAY_CART_KEY = 'pending_takeaway_cart';
const PENDING_BOOKING_DETAILS_KEY = 'pending_booking_details';

const verifyOtpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
});

type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyOtpComponent() {
  const { t } = useTranslation('auth');
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const { user: authUserFromContext, login } = useAuth(); 

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  const form = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      otp: "",
    },
  });

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handlePostVerificationActions = async (verifiedUserEmail: string) => {
    const redirectPath = searchParams.get('postLoginRedirectPath');
    const action = searchParams.get('postLoginAction');
    
    if (action === 'complete_order' || action === 'complete_booking') {
        toast({
            title: t('otpVerificationSuccessTitle'),
            description: t('otpVerifiedLoginPrompt', { email: verifiedUserEmail, action: (action === 'complete_order' ? 'order' : 'booking') }),
            duration: 7000,
        });
        let loginUrl = `/login?email=${encodeURIComponent(verifiedUserEmail)}`;
        if (redirectPath) loginUrl += `&postLoginRedirectPath=${encodeURIComponent(redirectPath)}`;
        if (action) loginUrl += `&postLoginAction=${encodeURIComponent(action)}`;
        router.push(loginUrl);
        return true;
    }
    return false;
  };


  async function onSubmit(values: VerifyOtpFormValues) {
    if (!email) {
        toast({ title: t('common:error'), description: t('errorEmailMissing'), variant: "destructive"});
        addClientLogEntry('OTP verification attempt failed: Email missing from query.', 'ERROR');
        return;
    }
    setIsSubmitting(true);
    addClientLogEntry('User attempting to verify signup OTP.', 'INFO', { email, otp: values.otp.substring(0,1) + '*****' });
    
    const result = await verifySignupOtpAndActivateUser(email, values.otp);
    
    if (result.success) {
        addClientLogEntry('Signup OTP verification successful.', 'INFO', { email });
        const actionHandled = await handlePostVerificationActions(email);
        if (!actionHandled) {
            toast({
                title: t('otpVerificationSuccessTitle'),
                description: result.message || t('otpVerificationSuccessMessage'),
                duration: 7000,
            });
            router.push('/login');
        }
    } else {
         toast({
            title: t('otpVerificationFailedTitle'),
            description: result.message || "Invalid OTP or an error occurred.", 
            variant: "destructive",
        });
        addClientLogEntry('Signup OTP verification failed.', 'ERROR', { email, error: result.message });
    }
    setIsSubmitting(false);
  }

  async function handleResendOtp() {
    if (!email || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    addClientLogEntry('User requesting resend of signup OTP.', 'INFO', { email });
    const result = await resendSignupOtp(email);

    if (result.success) {
      let toastDescription = result.message || t('otpSentDescription', { email });
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
       addClientLogEntry('Signup OTP resend successful.', 'INFO', { email, messageId: result.messageId });
    } else {
      toast({
        title: t('resendFailedTitle'),
        description: result.message || "Could not resend OTP at this time.",
        variant: "destructive",
      });
      addClientLogEntry('Signup OTP resend failed.', 'ERROR', { email, error: result.message });
    }
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setIsResending(false);
  }


  if (!email) {
    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
                 <CardTitle className="font-headline text-2xl text-destructive">{t('common:error')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{t('errorEmailMissing')}</p>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href="/signup"><ArrowLeft className="mr-2 h-4 w-4"/>{t('errorGoToSignup')}</Link>
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-primary flex items-center">
          <MailCheck className="mr-2 h-7 w-7"/> {t('verifyOtpTitle')}
        </CardTitle>
        <CardDescription dangerouslySetInnerHTML={{ __html: t('verifyOtpDescription', { email: email }) }} />
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <Alert variant="default" className="bg-amber-50 border-amber-300 text-amber-800">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                <AlertTitle className="font-semibold">{t('devOtpNoticeTitle')}</AlertTitle>
                <AlertDescription className="text-xs">{t('devOtpNoticeDescription')}</AlertDescription>
            </Alert>
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('otpLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('otpPlaceholder')} {...field} maxLength={6} autoFocus/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting || isResending}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4" />}
              {t('verifyOtpButton')}
            </Button>
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
             <Button variant="link" asChild className="p-0 text-primary">
                <Link href="/signup"><ArrowLeft className="mr-2 h-4 w-4" /> {t('backToSignupLink')}</Link>
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyOtpComponent />
        </Suspense>
    );
}
