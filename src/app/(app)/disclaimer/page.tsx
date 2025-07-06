
"use client";

import React from 'react';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle } from 'lucide-react';


export default function DisclaimerPage() {
  const { settings, isLoadingSettings } = useGeneralSettings();

  if (isLoadingSettings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-6 w-3/4 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  const content = settings.disclaimerContent || "<p>Disclaimer content not yet configured.</p>";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="font-headline text-3xl text-primary flex items-center">
            <AlertTriangle className="mr-3 h-7 w-7 text-accent" /> Disclaimer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ScrollArea className="h-[calc(100vh-20rem)]">
            <div
              className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none text-foreground/90"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
