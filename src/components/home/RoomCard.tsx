
"use client";

import type { Room } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Users } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';


export const RoomCard = ({ room }: { room: Room }) => {
  const { currencySymbol, convertPrice } = useCurrency();
  const firstImage = room.imageUrls.split(',')[0].trim() || 'https://placehold.co/800x600.png';
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <div className="relative w-full h-48">
        <Image src={firstImage} alt={room.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" data-ai-hint="hotel room" />
      </div>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="font-headline text-xl text-primary">{room.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="mr-2 h-4 w-4 text-accent" /> Capacity: {room.capacity}
        </div>
        <div className="flex items-center text-sm font-semibold text-foreground">
           <span className="font-bold text-lg text-accent">{currencySymbol}{convertPrice(room.pricePerNight).toFixed(2)}</span>
           <span className="text-xs text-muted-foreground ml-1">/night</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" size="sm">
          <Link href="/rooms">View & Book</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
