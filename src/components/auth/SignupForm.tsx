
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation"; 
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
import { Eye, EyeOff, UserPlus, Loader2 } from "lucide-react";
import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { addClientLogEntry } from "@/app/actions/logging-actions";
import { useTranslation } from 'react-i18next'; // Import useTranslation

const signupFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export function SignupForm() {
  const { t } = useTranslation('auth'); // Use 'auth' namespace
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const { signup, isLoadingAuth } = useAuth(); 
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  useEffect(() => {
    console.warn(
      "[SignupForm - CRITICAL_SECURITY_WARNING]\n" +
      "This is a PROTOTYPE application. Passwords entered here will be stored in PLAINTEXT in a CSV file on the server.\n" +
      "This is EXTREMELY INSECURE and should NEVER be done in a real application.\n" +
      "Do not use real or sensitive passwords. Use test credentials only."
    );
  }, []);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SignupFormValues) {
    setIsSubmitting(true);
    addClientLogEntry('[SignupForm] User attempting signup.', 'INFO', { name: values.name, email: values.email });
    
    const redirectPath = searchParams.get('postLoginRedirectPath') || undefined;
    const postAuthAction = searchParams.get('postLoginAction') || undefined;

    const result = await signup(values.name, values.email, values.password, redirectPath, postAuthAction);

    if (result.success && result.user) {
      if (result.otpSent) {
         toast({
            title: t('signupInitiatedTitle'),
            description: result.message || t('signupOtpSentMessage', { email: values.email }),
            duration: 7000,
        });
        addClientLogEntry('[SignupForm] User signup initiated, OTP sent.', 'INFO', { email: values.email, userId: result.user.id });
      } else {
        toast({
            title: t('signupFailedTitle'), // Consider a more nuanced title like "Account Created (OTP Issue)"
            description: result.message || t('signupOtpIssueMessage', { email: values.email }),
            variant: "destructive",
            duration: 10000,
        });
         addClientLogEntry('[SignupForm] User signup created user, but OTP step might be missing or failed.', 'WARN', { email: values.email, userId: result.user.id, message: result.message });
      }
    } else {
      toast({
        title: t('signupFailedTitle'),
        description: result.message || "Could not create your account.",
        variant: "destructive",
      });
      addClientLogEntry('[SignupForm] User signup failed via AuthContext.', 'ERROR', { email: values.email, error: result.message });
    }
    setIsSubmitting(false);
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-primary">{t('signupTitle')}</CardTitle>
        <CardDescription>{t('signupDescription')}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fullNameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('fullNamePlaceholder')} {...field} />
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
                  <FormLabel>{t('emailLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('emailPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('passwordLabel')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder={t('auth:newPasswordPlaceholder')} {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('common:hidePassword') : t('common:showPassword')}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('confirmPasswordLabel')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showConfirmPassword ? "text" : "password"} placeholder={t('passwordPlaceholder')} {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? t('common:hidePassword') : t('common:showPassword')}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingAuth}>
              {isSubmitting || isLoadingAuth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              {t('signupButton')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('alreadyHaveAccountPrompt')}{" "}
              <Button variant="link" asChild className="p-0 text-primary">
                 <Link href={{
                    pathname: '/login',
                    query: { 
                        postLoginRedirectPath: searchParams.get('postLoginRedirectPath') || '',
                        postLoginAction: searchParams.get('postLoginAction') || ''
                    }
                }}>{t('loginLink')}</Link>
              </Button>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
