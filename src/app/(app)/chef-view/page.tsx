
import { Suspense } from 'react';
import { ChefViewClient } from './ChefViewClient'; // Use the new client component
import { getOrders, getPrinterSettings } from '@/app/actions/data-management-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This is now a Server Component
export default async function ChefViewPage() {
    // Fetch data on the server
    const [initialOrders, initialPrinters] = await Promise.all([
        getOrders(),
        getPrinterSettings()
    ]);

    // Pass data as props to the Client Component
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading Chef's View...</p>
            </div>
        }>
            <ChefViewClient
                initialOrders={initialOrders}
                initialPrinters={initialPrinters}
            />
        </Suspense>
    );
}

