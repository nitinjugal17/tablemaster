"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { InvoiceSetupSettings } from '@/lib/types';

export const TakeawayCTASection = ({ generalSettings }: { generalSettings: Partial<InvoiceSetupSettings> }) => (
  <section id="takeaway" className="py-20 md:py-28 bg-cover bg-center bg-no-repeat relative" style={{backgroundImage: `url(${generalSettings.orderTakeawayMediaUrl || 'https://placehold.co/1200x400.png'})`}}>
    <div className="absolute inset-0 bg-black/60"></div>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-white mb-6">Order Takeaway</h2>
        <p className="text-lg text-gray-200 mb-10 max-w-2xl mx-auto">
            Enjoy our delicious food from the comfort of your home.
        </p>
        <Button size="lg" asChild>
            <Link href="/menu">Order Now</Link>
        </Button>
    </div>
  </section>
);
