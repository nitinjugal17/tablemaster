
"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { InvoiceSetupSettings } from '@/lib/types';

export const BookingCTASection = ({ generalSettings }: { generalSettings: Partial<InvoiceSetupSettings> }) => (
  <section id="book" className="py-20 md:py-28 bg-cover bg-center bg-no-repeat relative" style={{backgroundImage: `url(${generalSettings.bookATableMediaUrl || 'https://placehold.co/1200x400.png'})`}}>
    <div className="absolute inset-0 bg-primary/80"></div>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary-foreground mb-6">Reserve Your Table</h2>
        <p className="text-lg text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
            Planning a visit? Book your table online for a seamless experience.
        </p>
        <Button size="lg" variant="secondary" asChild>
            <Link href="/bookings">Book a Table</Link>
        </Button>
    </div>
  </section>
);
