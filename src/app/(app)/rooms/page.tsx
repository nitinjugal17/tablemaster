// src/app/(app)/rooms/page.tsx
import { Suspense } from 'react';
import { getRooms } from '@/app/actions/data-management-actions';
import { RoomsPageClient } from '@/components/rooms/RoomsPageClient';
import { Loader2 } from 'lucide-react';

export default async function RoomsPage() {
    const rooms = await getRooms();

    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading rooms...</p>
            </div>
        }>
            <RoomsPageClient initialRooms={rooms} />
        </Suspense>
    );
}
