
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Loader2, Star, MessageSquare } from "lucide-react";
import React, { useState, useEffect } from "react";
import { submitFeedback } from "@/app/actions/feedback-actions";
import { getFeedbackCategories } from "@/app/actions/data-management-actions";
import { addClientLogEntry } from "@/app/actions/logging-actions"; 
import type { FeedbackCategory } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const feedbackFormSchema = z.object({
  rating: z.coerce.number().min(1, "Please select a rating.").max(5),
  category: z.string().min(1, "Please select a category."),
  comments: z.string().min(10, "Comments must be at least 10 characters.").max(2000),
  customerName: z.string().optional(),
  contactInfo: z.string().optional(),
  source: z.enum(['qr_code', 'app', 'manual']).default('app'),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

export default function FeedbackPage() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categories, setCategories] = useState<FeedbackCategory[]>([]);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    async function fetchCategories() {
      setIsLoadingCategories(true);
      try {
        const fetchedCategories = await getFeedbackCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        toast({ title: "Error", description: "Could not load feedback categories.", variant: "destructive" });
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, [toast]);
  

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      rating: 0,
      category: "",
      comments: "",
      customerName: "",
      contactInfo: "",
      source: "app",
    },
  });

  async function onSubmit(values: FeedbackFormValues) {
    setIsSending(true);
    addClientLogEntry('User attempting to submit feedback.', 'INFO', { rating: values.rating, category: values.category });
    const result = await submitFeedback(values);
    if (result.success) {
      toast({
        title: "Feedback Submitted!",
        description: result.message,
      });
      addClientLogEntry('Feedback submitted successfully.', 'INFO', { rating: values.rating, category: values.category });
      form.reset();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
      addClientLogEntry('Failed to submit feedback.', 'ERROR', { error: result.message });
    }
    setIsSending(false);
  }

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full shadow-xl">
        <CardHeader className="text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="font-headline text-4xl text-primary">Share Your Feedback</CardTitle>
          <CardDescription className="text-lg">
            Your opinion matters to us! Help us improve by sharing your experience.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-center block mb-2">Overall Rating *</FormLabel>
                    <FormControl>
                        <div className="flex justify-center gap-2" onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-8 w-8 cursor-pointer transition-colors",
                              (hoverRating || field.value) >= star
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            )}
                            onMouseEnter={() => setHoverRating(star)}
                            onClick={() => field.onChange(star)}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback Category *</FormLabel>
                     {isLoadingCategories ? <Skeleton className="h-10 w-full" /> : (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Please share your detailed feedback here..." {...field} rows={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Jane Doe" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email/Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="So we can follow up" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Provide if you would like a direct response.</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg" disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSending ? "Submitting..." : "Submit Feedback"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
