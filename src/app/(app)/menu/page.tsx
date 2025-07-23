// src/app/(app)/menu/page.tsx
import { Suspense } from 'react';
import { getMenuItems, getOffers, getAddonGroups } from '@/app/actions/data-management-actions';
import { MenuPageClient } from '@/components/menu/MenuPageClient';
import { Loader2 } from 'lucide-react';

export const revalidate = 0; // Disable caching for this page

export default async function MenuPage() {
    const [menuItems, offers, addonGroups] = await Promise.all([
        getMenuItems(),
        getOffers(),
        getAddonGroups()
    ]);

    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading our delicious menu...</p>
            </div>
        }>
            <MenuPageClient 
                initialMenuItems={menuItems} 
                initialActiveOffers={offers} 
                initialAddonGroups={addonGroups}
            />
        </Suspense>
    );
}
