"use client";

import BannerDisplay from '@/components/marketing/BannerDisplay';
import type { Banner } from '@/lib/types';

export const ActiveBannersSection = ({ banners }: { banners: Banner[] }) => {
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
