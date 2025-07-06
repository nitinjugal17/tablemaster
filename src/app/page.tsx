
"use client"; 

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { UtensilsCrossed, CalendarDays, ShoppingBag, Sparkles, Info, AlertCircle, Loader2, Gift, Tag, GalleryHorizontal, Zap, BedDouble } from 'lucide-react';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { getShopOpenStatus, ShopStatus } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { HomepageSectionConfig, HomepageSectionId, MenuItem as MenuItemType, Offer, DiscountCode, Banner, MenuCategoryEnhancement } from '@/lib/types';
import { DEFAULT_HOMEPAGE_LAYOUT } from '@/lib/types';
import { getMenuItems, getOffers, getDiscounts, getBanners } from '@/app/actions/data-management-actions'; 
import OfferCard from '@/components/marketing/OfferCard';
import DiscountCard from '@/components/marketing/DiscountCard';
import BannerDisplay from '@/components/marketing/BannerDisplay';
import { format, parseISO, isWithinInterval, startOfToday, endOfToday, isFuture, isPast } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';


// Section Skeletons
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

const BannerSkeleton = () => (
    <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-48 md:h-64 w-full rounded-lg" />
        </div>
    </section>
);


// Section Components
const HeroSection = ({ generalSettings, shopStatus }: { generalSettings: any, shopStatus: ShopStatus | null }) => (
  <section className="relative py-20 md:py-32 bg-gradient-to-br from-primary/20 via-background to-background">
    <div className="absolute inset-0 opacity-30" style={{backgroundImage: `url(${generalSettings.heroBackgroundMediaUrl || 'https://placehold.co/1920x1080.png'})`, backgroundSize: 'cover', backgroundPosition: 'center'}} data-ai-hint="restaurant interior"></div>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
      <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary mb-6">
        Welcome to {generalSettings.companyName || "TableMaster"}
      </h1>
      <p className="text-xl md:text-2xl text-foreground/80 mb-10 max-w-3xl mx-auto">
        Your ultimate destination for delightful dining experiences. Explore our menu, book your table, or order takeaway with ease.
      </p>
      {shopStatus && !shopStatus.isOpen && (
        <Alert variant="destructive" className="max-w-2xl mx-auto mb-8 text-left bg-red-50 border-red-500 text-red-700">
          <AlertCircle className="h-5 w-5 text-red-700" />
          <AlertTitle className="font-headline text-xl">We Are Currently Closed</AlertTitle>
          <AlertDescription>
            {shopStatus.message}
          </AlertDescription>
        </Alert>
      )}
      <div className="space-x-4">
        <Button size="lg" asChild>
          <Link href="/menu">View Menu</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/bookings">Book a Table</Link>
        </Button>
      </div>
    </div>
  </section>
);

const FeaturesSection = ({ 
  isLoadingCategories, 
  uniqueCategories, 
  categoryEnhancementsMap 
}: { 
  isLoadingCategories: boolean, 
  uniqueCategories: string[], 
  categoryEnhancementsMap: Record<string, MenuCategoryEnhancement> 
}) => {
  return (
    <section id="features" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-center text-primary mb-6">
          Explore Our Menu by Category
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto text-center">
          Dive into our diverse range of culinary delights, organized by category for your convenience.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoadingCategories ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-lg" />)
          ) : uniqueCategories.length > 0 ? (
            uniqueCategories.map(category => {
              const enhancement = categoryEnhancementsMap[category];
              const imageUrl = enhancement?.backgroundImageUrl || `https://placehold.co/800x600.png?text=${encodeURIComponent(category)}`;
              return (
                <FeatureCard
                  key={category}
                  icon={<UtensilsCrossed className="h-12 w-12 text-accent" />}
                  title={category}
                  description={`Explore our delicious ${category.toLowerCase()} dishes, crafted with the freshest ingredients.`}
                  link="/menu" 
                  linkText={`View ${category}`}
                  imageUrl={imageUrl}
                  imageAiHint={category.toLowerCase().split(' ').slice(0, 2).join(' ')}
                />
              );
            })
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">No menu categories found to display at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const MenuHighlightsSection = ({ generalSettings }: { generalSettings: any }) => (
  <section id="menu" className="py-16 md:py-24 bg-muted/30" style={{backgroundImage: `url(${generalSettings.signatureDishBackgroundMediaUrl || 'https://placehold.co/1200x400.png'})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'}}>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center bg-background/80 backdrop-blur-sm py-10 rounded-lg">
      <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary mb-6">
        Our Signature Dishes
      </h2>
      <p className="text-lg text-foreground/80 mb-10 max-w-2xl mx-auto">
        A sneak peek into our culinary world. Visit our full menu page for more delights.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <MenuItemPreview name="Chef's Special Pasta" description="Rich creamy pasta with a secret blend of herbs." imageUrl="https://placehold.co/600x400.png" aiHint="pasta dish" />
        <MenuItemPreview name="Sizzling Steak" description="Perfectly grilled steak, tender and juicy." imageUrl="https://placehold.co/600x400.png" aiHint="steak dish"/>
        <MenuItemPreview name="Decadent Chocolate Cake" description="A chocolate lover's dream come true." imageUrl="https://placehold.co/600x400.png" aiHint="chocolate cake" />
      </div>
      <Button size="lg" variant="link" asChild className="mt-10 text-accent text-lg">
        <Link href="/menu">View Full Menu &rarr;</Link>
      </Button>
    </div>
  </section>
);

const BookingCTASection = ({ generalSettings }: { generalSettings: any }) => (
  <section id="book" className="py-20 md:py-28 bg-cover bg-center bg-no-repeat relative" style={{backgroundImage: `url(${generalSettings.bookATableMediaUrl || 'https://placehold.co/1200x400.png'})`}}>
    <div className="absolute inset-0 bg-primary/80"></div>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary-foreground mb-6">Reserve Your Table</h2>
        <p className="text-lg text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
            Planning a visit? Book your table online for a seamless experience.
        </p>
        <Button size="lg" variant="secondary" asChild>
            <Link href="/bookings">Book a Table</Link>
        </Button>
    </div>
  </section>
);

const RoomBookingCTASection = ({ generalSettings }: { generalSettings: any }) => (
  <section id="book-room" className="py-16 md:py-24 bg-secondary/10 relative">
    {generalSettings.roomBookingMediaUrl && (
       <div className="absolute inset-0 opacity-20">
        <Image src={generalSettings.roomBookingMediaUrl} alt="Comfortable hotel room" layout="fill" objectFit="cover" data-ai-hint="hotel room comfort"/>
       </div>
    )}
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary mb-6">Book a Room</h2>
        <p className="text-lg text-foreground/80 mb-10 max-w-2xl mx-auto">
            Extend your experience. View our available rooms for a comfortable stay.
        </p>
        <Button size="lg" asChild>
            <Link href="/rooms">View Rooms & Book</Link>
        </Button>
    </div>
  </section>
);

const TakeawayCTASection = ({ generalSettings }: { generalSettings: any }) => (
  <section id="takeaway" className="py-20 md:py-28 bg-cover bg-center bg-no-repeat relative" style={{backgroundImage: `url(${generalSettings.orderTakeawayMediaUrl || 'https://placehold.co/1200x400.png'})`}}>
    <div className="absolute inset-0 bg-black/60"></div>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-white mb-6">Order Takeaway</h2>
        <p className="text-lg text-gray-200 mb-10 max-w-2xl mx-auto">
            Enjoy our delicious food from the comfort of your home.
        </p>
        <Button size="lg" asChild>
            <Link href="/menu">Order Now</Link>
        </Button>
    </div>
  </section>
);

const ActiveOffersSection = ({ offers }: { offers: Offer[] }) => {
  if (offers.length === 0) return null;
  return (
    <section id="active-offers" className="py-16 md:py-24 bg-accent/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-center text-primary mb-6">
          <Gift className="inline-block h-10 w-10 mr-3 text-accent" /> Current Offers
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto text-center">
          Don't miss out on our special deals and promotions!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {offers.map(offer => <OfferCard key={offer.id} offer={offer} />)}
        </div>
      </div>
    </section>
  );
};

const ActiveDiscountsSection = ({ discounts }: { discounts: DiscountCode[] }) => {
  if (discounts.length === 0) return null;
  return (
    <section id="active-discounts" className="py-16 md:py-24 bg-secondary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-center text-primary mb-6">
          <Tag className="inline-block h-10 w-10 mr-3 text-accent" /> Available Discounts
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto text-center">
          Use these codes at checkout to save on your order.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {discounts.map(discount => <DiscountCard key={discount.id} discount={discount} />)}
        </div>
      </div>
    </section>
  );
};

const ActiveBannersSection = ({ banners }: { banners: Banner[] }) => {
  if (banners.length === 0) return null;
  const primaryBanner = banners.sort((a,b) => a.displayOrder - b.displayOrder)[0];
  if (!primaryBanner) return null;

  return (
    <section id="banners" className="py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <BannerDisplay banner={primaryBanner} />
      </div>
    </section>
  );
};

const TodaysSpecialSection = ({ items }: { items: MenuItemType[] }) => {
  if (items.length === 0) return null;
  return (
    <section id="todays-special" className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-headline text-3xl md:text-4xl font-semibold text-primary mb-6 flex items-center justify-center">
          <Zap className="mr-3 h-10 w-10 text-yellow-500" />
          Today's Specials
        </h2>
        <p className="text-lg text-foreground/80 mb-12 max-w-2xl mx-auto">
          Hand-picked by our chef just for you. Don't miss out on these exclusive dishes!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map(item => (
            <MenuItemPreview key={item.id} name={item.name} description={item.description} imageUrl={item.imageUrl} aiHint={item.aiHint} />
          ))}
        </div>
      </div>
    </section>
  );
};


export default function HomePage() {
  const { settings: generalSettings, isLoadingSettings } = useGeneralSettings();
  const [shopStatus, setShopStatus] = useState<ShopStatus | null>(null);
  
  // Individual data states
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);

  const [activeDiscounts, setActiveDiscounts] = useState<DiscountCode[]>([]);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(true);
  
  const [activeBanners, setActiveBanners] = useState<Banner[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);

  const [specialItems, setSpecialItems] = useState<MenuItemType[]>([]);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);
  const [isLoadingMenuData, setIsLoadingMenuData] = useState(true);

  const homepageLayout = useMemo(() => {
    if (isLoadingSettings || !generalSettings.homepageLayoutConfig) {
      return DEFAULT_HOMEPAGE_LAYOUT.filter(s => s.isVisible).sort((a,b) => a.order - b.order);
    }
    try {
      const parsedLayout = JSON.parse(generalSettings.homepageLayoutConfig) as HomepageSectionConfig[];
      const mergedLayout = DEFAULT_HOMEPAGE_LAYOUT.map(defaultSection => {
        const storedSection = parsedLayout.find(s => s.id === defaultSection.id);
        return { 
          ...defaultSection, 
          ...(storedSection || {}), 
          isVisible: storedSection ? storedSection.isVisible : defaultSection.isVisible,
          order: storedSection ? storedSection.order : defaultSection.order,
          name: defaultSection.name 
        };
      });
      return mergedLayout.filter(s => s.isVisible).sort((a, b) => a.order - b.order);
    } catch (e) {
      console.error("Failed to parse homepageLayoutConfig on homepage, using default layout:", e);
      return DEFAULT_HOMEPAGE_LAYOUT.filter(s => s.isVisible).sort((a,b) => a.order - b.order);
    }
  }, [generalSettings, isLoadingSettings]);

  const operatingHoursString = useMemo(() => 
    JSON.stringify(generalSettings?.operatingHours || {}), 
    [generalSettings?.operatingHours]
  );

  useEffect(() => {
    if (!isLoadingSettings && generalSettings?.operatingHours) {
      setShopStatus(getShopOpenStatus(generalSettings.operatingHours));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatingHoursString, isLoadingSettings]);


  // Fetch all marketing/menu data in parallel
  useEffect(() => {
    const fetchDataForSections = async () => {
      // Banners
      getBanners().then(allBanners => {
        const currentBanners = allBanners.filter(banner =>
          banner.isActive &&
          (!banner.validFrom || !isFuture(parseISO(banner.validFrom))) &&
          (!banner.validTo || !isPast(parseISO(banner.validTo)))
        );
        setActiveBanners(currentBanners);
      }).catch(e => console.error("Failed to fetch banners:", e)).finally(() => setIsLoadingBanners(false));

      // Offers
      getOffers().then(allOffers => {
        const currentOffers = allOffers.filter(offer => 
          offer.isActive &&
          (!offer.validFrom || !isFuture(parseISO(offer.validFrom))) &&
          (!offer.validTo || !isPast(parseISO(offer.validTo)))
        );
        setActiveOffers(currentOffers);
      }).catch(e => console.error("Failed to fetch offers:", e)).finally(() => setIsLoadingOffers(false));

      // Discounts
      getDiscounts().then(allDiscounts => {
        const currentDiscounts = allDiscounts.filter(discount =>
          discount.isActive &&
          (!discount.validFrom || !isFuture(parseISO(discount.validFrom))) &&
          (!discount.validTo || !isPast(parseISO(discount.validTo)))
        );
        setActiveDiscounts(currentDiscounts);
      }).catch(e => console.error("Failed to fetch discounts:", e)).finally(() => setIsLoadingDiscounts(false));

      // Specials AND Categories (from same call)
      getMenuItems().then(allItems => {
        const currentSpecialItems = allItems.filter(item => item.isTodaysSpecial && item.isAvailable);
        setSpecialItems(currentSpecialItems);
        
        const categories = [...new Set(allItems.map(item => item.category).filter(Boolean).sort())];
        setUniqueCategories(categories);
      }).catch(e => console.error("Failed to fetch menu items:", e)).finally(() => setIsLoadingMenuData(false));
    };

    fetchDataForSections();
  }, []);
  
  const categoryEnhancementsMap = useMemo(() => {
    if (isLoadingSettings || !generalSettings?.menuCategoryEnhancements) {
      return {};
    }
    try {
      const parsedEnhancements = JSON.parse(generalSettings.menuCategoryEnhancements) as MenuCategoryEnhancement[];
      const map: Record<string, MenuCategoryEnhancement> = {};
      parsedEnhancements.forEach(enh => {
        map[enh.categoryId] = enh;
      });
      return map;
    } catch (e) {
      console.error("Failed to parse menuCategoryEnhancements for homepage:", e);
      return {};
    }
  }, [generalSettings, isLoadingSettings]);

  if (isLoadingSettings) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="text-muted-foreground mt-4">Loading TableMaster...</p>
      </div>
    );
  }

  const sectionComponents: Record<HomepageSectionId, React.ReactNode> = {
    hero: <HeroSection generalSettings={generalSettings} shopStatus={shopStatus} />,
    banners: isLoadingBanners ? <BannerSkeleton /> : <ActiveBannersSection banners={activeBanners} />,
    features: <FeaturesSection isLoadingCategories={isLoadingMenuData} uniqueCategories={uniqueCategories} categoryEnhancementsMap={categoryEnhancementsMap} />,
    todays_special: isLoadingMenuData ? <SectionSkeleton /> : <TodaysSpecialSection items={specialItems} />,
    active_offers: isLoadingOffers ? <SectionSkeleton /> : <ActiveOffersSection offers={activeOffers} />,
    active_discounts: isLoadingDiscounts ? <SectionSkeleton /> : <ActiveDiscountsSection discounts={activeDiscounts} />,
    menu_highlights: <MenuHighlightsSection generalSettings={generalSettings} />,
    booking_cta: <BookingCTASection generalSettings={generalSettings} />,
    room_booking_cta: <RoomBookingCTASection generalSettings={generalSettings} />,
    takeaway_cta: <TakeawayCTASection generalSettings={generalSettings} />,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {homepageLayout.map(section => (
            <React.Fragment key={section.id}>
                {sectionComponents[section.id]}
            </React.Fragment>
        ))}
      </main>
      <Footer />
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  linkText: string;
  imageUrl: string;
  imageAiHint: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, link, linkText, imageUrl, imageAiHint }) => (
  <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
    <div className="relative w-full h-40">
        <Image 
          src={imageUrl} 
          alt={title} 
          fill 
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover rounded-t-lg"
          data-ai-hint={imageAiHint}
        />
    </div>
    <CardHeader className="pt-4 pb-2">
      <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-2">
        {icon}
      </div>
      <CardTitle className="font-headline text-xl text-primary">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      <CardDescription className="text-foreground/70 text-sm">{description}</CardDescription>
    </CardContent>
    <CardFooter>
         <Button variant="link" asChild className="text-accent w-full">
            <Link href={link}>{linkText} &rarr;</Link>
        </Button>
    </CardFooter>
  </Card>
);

interface MenuItemPreviewProps {
  name: string;
  description: string;
  imageUrl: string;
  aiHint?: string;
}

const MenuItemPreview: React.FC<MenuItemPreviewProps> = ({ name, description, imageUrl, aiHint }) => (
  <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
    <div className="relative w-full h-48">
      <Image 
        src={imageUrl} 
        alt={name} 
        fill 
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover" 
        data-ai-hint={aiHint} 
      />
    </div>
    <CardContent className="p-6">
      <h3 className="font-headline text-xl font-semibold text-primary mb-2">{name}</h3>
      <p className="text-sm text-foreground/70">{description}</p>
    </CardContent>
  </Card>
);

    