
"use client";

import React from 'react';
import type { Room } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BedDouble, Users, IndianRupee, Wifi, Tv, Coffee } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCurrency } from '@/hooks/useCurrency';

function AmenityIcon({ amenity }: { amenity: string }) {
  const lowerAmenity = amenity.toLowerCase();
  if (lowerAmenity.includes('wifi')) return <Wifi className="h-4 w-4 text-accent" />;
  if (lowerAmenity.includes('tv')) return <Tv className="h-4 w-4 text-accent" />;
  if (lowerAmenity.includes('coffee')) return <Coffee className="h-4 w-4 text-accent" />;
  return <BedDouble className="h-4 w-4 text-accent" />;
}

interface RoomsPageClientProps {
    initialRooms: Room[];
}

export function RoomsPageClient({ initialRooms }: RoomsPageClientProps) {
  const { currencySymbol } = useCurrency();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold text-primary">Our Rooms</h1>
        <p className="text-muted-foreground">Discover the perfect space for your stay. Book a room along with your dining experience.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {initialRooms.length > 0 ? (
          initialRooms.map(room => {
            const firstImage = room.imageUrls.split(',')[0].trim();
            const amenities = room.amenities.split(',').map(a => a.trim());
            return (
              <Card key={room.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <div className="relative w-full h-56">
                  <Image
                    src={firstImage || 'https://placehold.co/800x600.png'}
                    alt={room.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    data-ai-hint="hotel room"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="font-headline text-xl text-primary">{room.name}</CardTitle>
                  <CardDescription className="line-clamp-3 h-[60px]">{room.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /> Capacity: {room.capacity}</span>
                    <span className="flex items-center gap-2 font-semibold text-foreground"><IndianRupee className="h-4 w-4 text-accent" /> {room.pricePerNight}/night</span>
                  </div>
                  <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Amenities:</h4>
                      <div className="flex flex-wrap gap-2">
                        {amenities.slice(0, 4).map(amenity => (
                            <div key={amenity} className="flex items-center text-xs gap-1.5 bg-muted/70 p-1.5 rounded-md">
                                <AmenityIcon amenity={amenity} />
                                <span>{amenity}</span>
                            </div>
                        ))}
                      </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/bookings">Book Now</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-10">No rooms are available at the moment. Please check back later.</p>
        )}
      </div>
    </div>
  );
}
