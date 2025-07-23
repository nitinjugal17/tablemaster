
"use client";

import { MenuItemPreview } from './MenuItemPreview';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { InvoiceSetupSettings, MenuItem } from '@/lib/types';

export const MenuHighlightsSection = ({ items, generalSettings }: { items: MenuItem[], generalSettings: Partial<InvoiceSetupSettings> }) => {
  if (items.length === 0) return null;
  return (
    <section id="menu" className="py-16 md:py-24 bg-muted/30" style={{backgroundImage: `url(${generalSettings.signatureDishBackgroundMediaUrl || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'}}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center bg-background/80 backdrop-blur-sm py-10 rounded-lg">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary mb-6">
          Our Signature Dishes
        </h2>
        <p className="text-lg text-foreground/80 mb-10 max-w-2xl mx-auto">
          A sneak peek into our culinary world. Visit our full menu page for more delights.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.slice(0, 3).map(item => (
            <MenuItemPreview key={item.id} name={item.name} description={item.description} imageUrl={item.imageUrl} aiHint={item.aiHint} />
          ))}
        </div>
        <Button size="lg" variant="link" asChild className="mt-10 text-accent text-lg">
          <Link href="/menu">View Full Menu &rarr;</Link>
        </Button>
      </div>
    </section>
  );
};
