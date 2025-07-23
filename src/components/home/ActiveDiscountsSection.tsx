
"use client";

import DiscountCard from '@/components/marketing/DiscountCard';
import type { DiscountCode } from '@/lib/types';
import { Tag } from 'lucide-react';

export const ActiveDiscountsSection = ({ discounts }: { discounts: DiscountCode[] }) => {
  if (discounts.length === 0) return null;
  return (
    <section id="active-discounts" className="py-16 md:py-24 bg-secondary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-center text-primary mb-6">
          <Tag className="inline-block h-10 w-10 mr-3 text-accent" /> Available Discounts
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto text-center">
          Use these codes at checkout to save on your order.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {discounts.map(discount => <DiscountCard key={discount.id} discount={discount} />)}
        </div>
      </div>
    </section>
  );
};
