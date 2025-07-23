
// src/app/page.tsx
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getMenuItems, getOffers, getDiscounts, getBanners, getRestaurantTables, getRooms, getGeneralSettings, getManagedImages } from '@/app/actions/data-management-actions';
import type { MenuItem, Offer, DiscountCode, Banner, RestaurantTable, Room, InvoiceSetupSettings, ManagedImage } from '@/lib/types';
import { HomePageClient } from '@/components/home/HomePageClient';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

// Fetch all data for the homepage on the server.
async function getHomePageData() {
  try {
    const [
      menuItems, offers, discounts, banners, tables, rooms, 
      generalSettings, managedImages
    ] = await Promise.all([
      getMenuItems(), getOffers(), getDiscounts(), getBanners(), 
      getRestaurantTables(), getRooms(), getGeneralSettings(),
      getManagedImages()
    ]);

    return { menuItems, offers, discounts, banners, tables, rooms, generalSettings, managedImages };
  } catch (error) {
    console.error("Failed to fetch homepage data:", error);
    // Return empty arrays on failure to prevent page crash
    return { 
      menuItems: [], offers: [], discounts: [], banners: [], 
      tables: [], rooms: [], generalSettings: null, managedImages: []
    };
  }
}

export default async function HomePage() {
  const data = await getHomePageData();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
         <Suspense fallback={
            <div className="flex flex-col min-h-screen items-center justify-center">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-muted-foreground mt-4">Loading TableMaster...</p>
            </div>
         }>
          <HomePageClient
            initialMenuItems={data.menuItems}
            initialOffers={data.offers}
            initialDiscounts={data.discounts}
            initialBanners={data.banners}
            initialTables={data.tables}
            initialRooms={data.rooms}
            initialGeneralSettings={data.generalSettings}
            initialManagedImages={data.managedImages}
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
