"use client";

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import type { InvoiceSetupSettings } from '@/lib/types';

export const RoomBookingCTASection = ({ generalSettings }: { generalSettings: Partial<InvoiceSetupSettings> }) => (
  <section id="book-room" className="py-16 md:py-24 bg-secondary/10 relative">
    {generalSettings.roomBookingMediaUrl && (
       <div className="absolute inset-0 opacity-20">
        <Image src={generalSettings.roomBookingMediaUrl} alt="Comfortable hotel room" fill className="object-cover" data-ai-hint="hotel room comfort"/>
       </div>
    )}
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary mb-6">Book a Room</h2>
        <p className="text-lg text-foreground/80 mb-10 max-w-2xl mx-auto">
            Extend your experience. View our available rooms for a comfortable stay.
        </p>
        <Button size="lg" asChild>
            <Link href="/rooms">View Rooms & Book</Link>
        </Button>
    </div>
  </section>
);
