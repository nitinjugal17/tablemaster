
"use client"; 

import React, { useState, useEffect, useMemo } from 'react';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { getShopOpenStatus, ShopStatus } from '@/lib/utils';
import type { HomepageSectionConfig, HomepageSectionId, MenuItem as MenuItemType, Offer, DiscountCode, Banner, ManagedImage, RestaurantTable, Room, InvoiceSetupSettings } from '@/lib/types';
import { DEFAULT_HOMEPAGE_LAYOUT } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { MenuHighlightsSection } from '@/components/home/MenuHighlightsSection';
import { BookingCTASection } from '@/components/home/BookingCTASection';
import { RoomBookingCTASection } from '@/components/home/RoomBookingCTASection';
import { TakeawayCTASection } from '@/components/home/TakeawayCTASection';
import { ActiveOffersSection } from '@/components/home/ActiveOffersSection';
import { ActiveDiscountsSection } from '@/components/home/ActiveDiscountsSection';
import { ActiveBannersSection } from '@/components/home/ActiveBannersSection';
import { TodaysSpecialSection } from '@/components/home/TodaysSpecialSection';
import { TableGridSection } from '@/components/home/TableGridSection';
import { RoomGridSection } from '@/components/home/RoomGridSection';
import { parseISO, isFuture, isPast } from 'date-fns';

const SectionSkeleton = ({ hasIcon = true }: { hasIcon?: boolean }) => (
  <section className="py-16 md:py-24 bg-muted/20">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {hasIcon && <Skeleton className="h-12 w-12 mx-auto mb-4 rounded-full" />}
      <Skeleton className="h-10 w-1/2 mx-auto mb-6" />
      <Skeleton className="h-6 w-3/4 mx-auto mb-12" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  </section>
);

interface HomePageClientProps {
  initialMenuItems: MenuItemType[];
  initialOffers: Offer[];
  initialDiscounts: DiscountCode[];
  initialBanners: Banner[];
  initialTables: RestaurantTable[];
  initialRooms: Room[];
  initialGeneralSettings: InvoiceSetupSettings | null;
  initialManagedImages: ManagedImage[];
}

export function HomePageClient({
  initialMenuItems,
  initialOffers,
  initialDiscounts,
  initialBanners,
  initialTables,
  initialRooms,
  initialGeneralSettings,
  initialManagedImages,
}: HomePageClientProps) {
  const { settings: contextGeneralSettings, isLoadingSettings: isContextLoading } = useGeneralSettings();
  const [shopStatus, setShopStatus] = useState<ShopStatus | null>(null);

  const generalSettings = initialGeneralSettings || contextGeneralSettings;
  const isLoadingSettings = !initialGeneralSettings && isContextLoading;
  
  const activeOffers = useMemo(() => initialOffers.filter(offer => 
    offer.isActive &&
    (!offer.validFrom || !isFuture(parseISO(offer.validFrom))) &&
    (!offer.validTo || !isPast(parseISO(offer.validTo)))
  ), [initialOffers]);

  const activeDiscounts = useMemo(() => initialDiscounts.filter(discount =>
    discount.isActive &&
    (!discount.validFrom || !isFuture(parseISO(discount.validFrom))) &&
    (!discount.validTo || !isPast(parseISO(discount.validTo)))
  ), [initialDiscounts]);

  const activeBanners = useMemo(() => initialBanners.filter(banner =>
    banner.isActive &&
    (!banner.validFrom || !isFuture(parseISO(banner.validFrom))) &&
    (!banner.validTo || !isPast(parseISO(banner.validTo)))
  ), [initialBanners]);

  const signatureItems = useMemo(() => initialMenuItems.filter(item => item.isSignatureDish && item.isAvailable), [initialMenuItems]);
  const specialItems = useMemo(() => initialMenuItems.filter(item => item.isTodaysSpecial && item.isAvailable), [initialMenuItems]);
  const uniqueCategories = useMemo(() => Array.from(new Set(initialMenuItems.map(item => item.category).filter(Boolean).sort())).slice(0, 4), [initialMenuItems]);

  const homepageLayout = useMemo(() => {
    if (isLoadingSettings || !generalSettings) {
      return [];
    }
    try {
      const storedLayoutString = generalSettings.homepageLayoutConfig;
      if (typeof storedLayoutString === 'string' && storedLayoutString.trim().startsWith('[')) {
        const parsedLayout = JSON.parse(storedLayoutString) as HomepageSectionConfig[];
        const layoutMap = new Map(parsedLayout.map(s => [s.id, s]));
        
        const mergedLayout = DEFAULT_HOMEPAGE_LAYOUT.map(defaultSection => {
          const storedSection = layoutMap.get(defaultSection.id);
          return {
            ...defaultSection,
            isVisible: storedSection ? storedSection.isVisible : defaultSection.isVisible,
            order: storedSection ? storedSection.order : defaultSection.order,
          };
        });

        return mergedLayout.filter(s => s.isVisible).sort((a, b) => a.order - b.order);
      }
    } catch (e) {
      console.error("Failed to parse homepageLayoutConfig, using default layout:", e);
    }
    return DEFAULT_HOMEPAGE_LAYOUT.filter(s => s.isVisible).sort((a, b) => a.order - b.order);
  }, [generalSettings, isLoadingSettings]);

  useEffect(() => {
    if (!isLoadingSettings && generalSettings?.operatingHours) {
      setShopStatus(getShopOpenStatus(generalSettings.operatingHours));
    }
  }, [generalSettings, isLoadingSettings]);

  const categoryImagesMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (initialManagedImages) {
        initialManagedImages
            .filter(img => img.context === 'menu_item' && img.entityId)
            .forEach(img => {
                map[img.entityId!] = img.imageUrl;
            });
    }
    return map;
  }, [initialManagedImages]);

  if (isLoadingSettings) {
    return (
        <>
            <SectionSkeleton hasIcon={false}/>
            <SectionSkeleton />
            <SectionSkeleton />
        </>
    );
  }

  const sectionComponents: Record<HomepageSectionId, React.ReactNode> = {
    hero: <HeroSection generalSettings={generalSettings} shopStatus={shopStatus} />,
    banners: activeBanners.length > 0 ? <ActiveBannersSection banners={activeBanners} /> : null,
    features: <FeaturesSection isLoadingCategories={false} uniqueCategories={uniqueCategories} categoryImagesMap={categoryImagesMap} />,
    todays_special: specialItems.length > 0 ? <TodaysSpecialSection items={specialItems} /> : null,
    active_offers: activeOffers.length > 0 ? <ActiveOffersSection offers={activeOffers} /> : null,
    active_discounts: activeDiscounts.length > 0 ? <ActiveDiscountsSection discounts={activeDiscounts} /> : null,
    menu_highlights: <MenuHighlightsSection items={signatureItems} generalSettings={generalSettings} />,
    table_grid: initialTables.length > 0 ? <TableGridSection tables={initialTables} /> : null,
    room_grid: initialRooms.length > 0 ? <RoomGridSection rooms={initialRooms} /> : null,
    booking_cta: <BookingCTASection generalSettings={generalSettings} />,
    room_booking_cta: <RoomBookingCTASection generalSettings={generalSettings} />,
    takeaway_cta: <TakeawayCTASection generalSettings={generalSettings} />,
  };
  
  return (
    <>
      {homepageLayout.map(
        (
          section: HomepageSectionConfig
        ): React.ReactElement | null => (
          <React.Fragment key={section.id}>
            {sectionComponents[section.id]}
          </React.Fragment>
        )
      )}
    </>
  );
}
