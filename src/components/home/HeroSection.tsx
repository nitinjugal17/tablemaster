
"use client";

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ShopStatus } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { InvoiceSetupSettings } from '@/lib/types';

interface HeroSectionProps {
  generalSettings: Partial<InvoiceSetupSettings>;
  shopStatus: ShopStatus | null;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ generalSettings, shopStatus }) => (
  <section className="relative py-20 md:py-32 bg-gradient-to-br from-primary/20 via-background to-background">
    <div className="absolute inset-0 opacity-30" style={{backgroundImage: `url(${generalSettings.heroBackgroundMediaUrl || 'https://placehold.co/1920x1080.png'})`, backgroundSize: 'cover', backgroundPosition: 'center'}} data-ai-hint="restaurant interior"></div>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
      <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-bold text-primary mb-6">
        Welcome to {generalSettings.companyName || "TableMaster"}
      </h1>
      <p className="text-lg md:text-2xl text-foreground/80 mb-10 max-w-3xl mx-auto">
        Your ultimate destination for delightful dining experiences. Explore our menu, book your table, or order takeaway with ease.
      </p>
      {shopStatus && !shopStatus.isOpen && (
        <Alert variant="destructive" className="max-w-2xl mx-auto mb-8 text-left bg-red-50 border-red-500 text-red-700">
          <AlertCircle className="h-5 w-5 text-red-700" />
          <AlertTitle className="font-headline text-xl">We Are Currently Closed</AlertTitle>
          <AlertDescription>
            {shopStatus.message}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" asChild>
          <Link href="/menu">View Menu</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/bookings">Book a Table</Link>
        </Button>
      </div>
    </div>
  </section>
);
