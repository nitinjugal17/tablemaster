"use client";

import type { RestaurantTable } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Columns3 } from 'lucide-react';
import { TableCard } from './TableCard';

export const TableGridSection = ({ tables }: { tables: RestaurantTable[] }) => {
  if (tables.length === 0) return null;
  return (
    <section id="table_grid" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-center text-primary mb-6">
          <Columns3 className="inline-block h-10 w-10 mr-3 text-accent" /> Reserve Your Table
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto text-center">
          Choose from our selection of tables to find the perfect spot for your dining experience.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {tables.slice(0, 4).map(table => <TableCard key={table.id} table={table} />)}
        </div>
         <div className="text-center mt-12">
            <Button size="lg" asChild>
                <Link href="/bookings">View All Tables & Book</Link>
            </Button>
        </div>
      </div>
    </section>
  );
}
