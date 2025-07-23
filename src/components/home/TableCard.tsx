
"use client";

import type { RestaurantTable } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Users } from 'lucide-react';

export const TableCard = ({ table }: { table: RestaurantTable }) => (
  <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
    <div className="relative w-full h-40">
      <Image src={`https://placehold.co/600x400.png`} alt={table.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" data-ai-hint="restaurant table" />
    </div>
    <CardHeader className="pb-2 pt-4">
      <CardTitle className="font-headline text-xl text-primary">{table.name}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      <div className="flex items-center text-sm text-muted-foreground">
        <Users className="mr-2 h-4 w-4 text-accent" /> Capacity: {table.capacity}
      </div>
    </CardContent>
    <CardFooter>
      <Button asChild className="w-full" size="sm">
        <Link href="/bookings">Book Now</Link>
      </Button>
    </CardFooter>
  </Card>
);
