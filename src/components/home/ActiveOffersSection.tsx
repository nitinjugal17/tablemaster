"use client";

import OfferCard from '@/components/marketing/OfferCard';
import type { Offer } from '@/lib/types';
import { Gift } from 'lucide-react';

export const ActiveOffersSection = ({ offers }: { offers: Offer[] }) => {
  if (offers.length === 0) return null;
  return (
    <section id="active-offers" className="py-16 md:py-24 bg-accent/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-center text-primary mb-6">
          <Gift className="inline-block h-10 w-10 mr-3 text-accent" /> Current Offers
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto text-center">
          Don't miss out on our special deals and promotions!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {offers.map(offer => <OfferCard key={offer.id} offer={offer} />)}
        </div>
      </div>
    </section>
  );
};
