
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
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import React, { useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { addClientLogEntry } from "@/app/actions/logging-actions";
import { placePublicTakeawayOrder } from "@/app/actions/order-actions";
import { saveNewBooking } from "@/app/actions/booking-actions";
import type { OrderItem, Booking, Order } from "@/lib/types";
import { useTranslation } from 'react-i18next';
import { BookingFormValues } from '@/components/bookings/BookingForm'; 
import { format } from 'date-fns'; 

const PENDING_TAKEAWAY_CART_KEY = 'pending_takeaway_cart';
const PENDING_BOOKING_DETAILS_KEY = 'pending_booking_details';


const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }), 
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function LoginComponent() {
  const { t } = useTranslation('auth');
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const { login, isLoadingAuth, user: authenticatedUser } = useAuth(); 
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  useEffect(() => {
    console.warn(
      "[LoginPage - CRITICAL_SECURITY_WARNING]\n" +
      "This is a PROTOTYPE application. Passwords are checked against PLAINTEXT values stored in a CSV file on the server.\n" +
      "This is EXTREMELY INSECURE and MUST NEVER BE USED IN A PRODUCTION ENVIRONMENT.\n" +
      "Do not use real passwords."
    );
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handlePostLoginActions = async (loggedInUserId: string) => {
    const redirectPath = searchParams.get('postLoginRedirectPath');
    const action = searchParams.get('postLoginAction');

    if (action === 'complete_order') {
      const storedCartData = localStorage.getItem(PENDING_TAKEAWAY_CART_KEY);
      if (storedCartData) {
        const cartItems: OrderItem[] = JSON.parse(storedCartData);
        localStorage.removeItem(PENDING_TAKEAWAY_CART_KEY);
        
        const orderData: Order = {
          id: `ORD-${crypto.randomUUID().substring(0,8).toUpperCase()}`,
          userId: loggedInUserId,
          items: cartItems,
          total: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          status: 'Pending',
          orderType: 'Takeaway',
          customerName: authenticatedUser?.name || "Customer",
          email: authenticatedUser?.email,
          createdAt: new Date().toISOString(),
        };
        const orderResult = await placePublicTakeawayOrder(orderData);
        if (orderResult.success) {
          toast({ title: t('common:success'), description: t('common:takeawayOrderPlacedSuccess') });
          router.push(redirectPath || '/orders');
        } else {
          toast({ title: t('common:error'), description: t('common:takeawayOrderPlacedError', { message: orderResult.message }), variant: "destructive" });
          router.push(redirectPath || '/menu'); 
        }
        return true; 
      }
    } else if (action === 'complete_booking') {
      const storedBookingData = localStorage.getItem(PENDING_BOOKING_DETAILS_KEY);
      if (storedBookingData) {
        const bookingDetails: BookingFormValues = JSON.parse(storedBookingData);
        localStorage.removeItem(PENDING_BOOKING_DETAILS_KEY);
        
        const bookingDataToSave: Booking = {
            id: `BKG-${crypto.randomUUID().substring(0,8).toUpperCase()}`,
            userId: loggedInUserId,
            customerName: bookingDetails.name,
            phone: bookingDetails.phone,
            email: bookingDetails.email || undefined,
            date: format(new Date(bookingDetails.date), "yyyy-MM-dd"), // Parse stringified date back to Date, then format
            time: bookingDetails.time,
            partySize: bookingDetails.partySize,
            items: bookingDetails.selectedItems,
            status: 'pending',
            bookingType: 'table', // Public form is for tables
            requestedResourceId: bookingDetails.requestedResourceId || undefined,
            notes: bookingDetails.notes || undefined,
        };
        const bookingResult = await saveNewBooking(bookingDataToSave);
        if (bookingResult.success) {
          toast({ title: t('common:success'), description: t('common:bookingRequestSuccess') });
          router.push(redirectPath || '/dashboard');
        } else {
          toast({ title: t('common:error'), description: t('common:bookingRequestError', { message: bookingResult.message }), variant: "destructive" });
          router.push(redirectPath || '/bookings');
        }
        return true; 
      }
    }
    return false; 
  };


  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    addClientLogEntry('[LoginPage] User attempting login.', 'INFO', { email: values.email });
    
    const result = await login(values.email, values.password);

    if (result.success && result.user) {
      toast({
        title: t('loginSuccessTitle'),
        description: t('welcomeBackMessage', { name: result.user.name || result.user.email }),
      });
      addClientLogEntry('[LoginPage] User login successful via AuthContext.', 'INFO', { email: values.email, userId: result.user.id, role: result.user.role });
      
      const actionHandled = await handlePostLoginActions(result.user.id);
      if (!actionHandled) {
        const redirectPath = searchParams.get('postLoginRedirectPath');
        router.push(redirectPath || '/dashboard'); 
      }

    } else {
      toast({
        title: t('loginFailedTitle'),
        description: result.message || "Invalid credentials or an error occurred.",
        variant: "destructive",
      });
      addClientLogEntry('[LoginPage] User login failed via AuthContext.', 'WARN', { email: values.email, error: result.message });
    }
    setIsSubmitting(false);
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-primary">{t('loginTitle')}</CardTitle>
        <CardDescription>{t('loginDescription')}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
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
                      <Input type={showPassword ? "text" : "password"} placeholder={t('passwordPlaceholder')} {...field} />
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
                  <div className="text-right">
                    <Button variant="link" asChild className="p-0 text-sm text-muted-foreground h-auto">
                        <Link href="/forgot-password">{t('forgotPasswordLink')}</Link>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingAuth}>
              {isSubmitting || isLoadingAuth ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              {t('loginButton')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('noAccountPrompt')}{" "}
              <Button variant="link" asChild className="p-0 text-primary">
                <Link href={{
                    pathname: '/signup',
                    query: { 
                        postLoginRedirectPath: searchParams.get('postLoginRedirectPath') || '',
                        postLoginAction: searchParams.get('postLoginAction') || ''
                    }
                }}>{t('signupLink')}</Link>
              </Button>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginComponent />
    </Suspense>
  );
}
