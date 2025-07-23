
"use client";

import type { Room } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BedDouble } from 'lucide-react';
import { RoomCard } from './RoomCard';

export const RoomGridSection = ({ rooms }: { rooms: Room[] }) => {
  if (rooms.length === 0) return null;
  return (
    <section id="room_grid" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-center text-primary mb-6">
          <BedDouble className="inline-block h-10 w-10 mr-3 text-accent" /> Book Your Stay
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto text-center">
          Enhance your visit with a comfortable stay. Browse our available rooms.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.slice(0, 3).map(room => <RoomCard key={room.id} room={room} />)}
        </div>
         <div className="text-center mt-12">
            <Button size="lg" asChild>
                <Link href="/rooms">View All Rooms & Book</Link>
            </Button>
        </div>
      </div>
    </section>
  );
}
