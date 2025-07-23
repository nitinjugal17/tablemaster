"use client";

import { MenuItemPreview } from './MenuItemPreview';
import type { MenuItem } from '@/lib/types';
import { Zap } from 'lucide-react';

export const TodaysSpecialSection = ({ items }: { items: MenuItem[] }) => {
  if (items.length === 0) return null;
  return (
    <section id="todays-special" className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary mb-6 flex items-center justify-center">
          <Zap className="mr-3 h-10 w-10 text-yellow-500" />
          Today's Specials
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto">
          Hand-picked by our chef just for you. Don't miss out on these exclusive dishes!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map(item => (
            <MenuItemPreview key={item.id} name={item.name} description={item.description} imageUrl={item.imageUrl} aiHint={item.aiHint} />
          ))}
        </div>
      </div>
    </section>
  );
};
