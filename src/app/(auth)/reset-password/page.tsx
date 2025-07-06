
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
import { Eye, EyeOff, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPasswordWithOtp } from "@/app/actions/auth-actions"; 
import { addClientLogEntry } from "@/app/actions/logging-actions";

const resetPasswordSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
  password: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      otp: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!email) {
        toast({ title: "Error", description: "Email is missing. Cannot reset password.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    addClientLogEntry('User attempting to reset password with OTP.', 'INFO', { email, otp: values.otp.substring(0,1) + '*****' });
    
    const result = await resetPasswordWithOtp(email, values.otp, values.password);
    
    if (result.success) {
        toast({
        title: "Password Reset Processed",
        description: result.message, 
        duration: 7000,
        });
        addClientLogEntry('Password reset with OTP successful (conceptual).', 'INFO', { email });
        router.push('/login');
    } else {
         toast({
            title: "Password Reset Failed",
            description: result.message, 
            variant: "destructive",
        });
        addClientLogEntry('Password reset with OTP failed.', 'ERROR', { email, error: result.message });
    }
    setIsSubmitting(false);
  }

  if (!email) {
    return (
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
                 <CardTitle className="font-headline text-2xl text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Email parameter is missing. Please initiate the password reset process again.</p>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href="/forgot-password"><ArrowLeft className="mr-2 h-4 w-4"/>Go to Forgot Password</Link>
                </Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-primary">Reset Password</CardTitle>
        <CardDescription>Enter the OTP sent to {email} and your new password. If email is not configured, check server console or use Dev OTP for testing.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>One-Time Password (OTP)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter 6-digit OTP" {...field} maxLength={6} autoFocus/>
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
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
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
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4" />}
              Reset Password
            </Button>
             <Button variant="link" asChild className="p-0 text-primary">
                <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Login</Link>
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}


export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordComponent />
        </Suspense>
    );
}

