
"use client";

import React from 'react';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

export default function FAQPage() {
  const { settings, isLoadingSettings } = useGeneralSettings();
  const [faqItems, setFaqItems] = React.useState<FAQItem[]>([]);

  React.useEffect(() => {
    if (!isLoadingSettings && settings.faqContent) {
      try {
        const parsedFaqs = JSON.parse(settings.faqContent);
        if (Array.isArray(parsedFaqs)) {
          setFaqItems(parsedFaqs.filter(item => typeof item.q === 'string' && typeof item.a === 'string'));
        } else {
          setFaqItems([]);
        }
      } catch (error) {
        console.error("Error parsing FAQ content:", error);
        setFaqItems([]);
      }
    } else if (!isLoadingSettings && !settings.faqContent) {
        setFaqItems([]);
    }
  }, [settings, isLoadingSettings]);

  if (isLoadingSettings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-3xl text-primary flex items-center">
            <HelpCircle className="mr-3 h-7 w-7 text-accent" /> Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {faqItems.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-left font-semibold text-primary/90 hover:text-primary">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-foreground/80">
                    <div dangerouslySetInnerHTML={{ __html: item.a }} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="text-muted-foreground text-center py-8">No FAQs have been configured yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    