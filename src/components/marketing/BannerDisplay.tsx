
"use client";

import type { Banner } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

interface BannerDisplayProps {
  banner: Banner;
}

const BannerDisplay: React.FC<BannerDisplayProps> = ({ banner }) => {
  const bannerImage = (
    <Image
      src={banner.imageUrl}
      alt={banner.title}
      width={1200} // Provide a base width for aspect ratio calculation
      height={banner.imageUrl.includes('placehold.co') ? 300 : 400} // Adjust height based on if placeholder or actual image
      className="rounded-lg object-cover w-full h-auto"
      data-ai-hint={banner.aiHint || banner.title.toLowerCase().split(' ').slice(0,2).join(' ')}
      priority // Mark as priority if it's likely LCP
    />
  );

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-0">
        {banner.linkUrl ? (
          <Link href={banner.linkUrl} passHref legacyBehavior>
            <a aria-label={banner.title} target={banner.linkUrl.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer">
              {bannerImage}
            </a>
          </Link>
        ) : (
          bannerImage
        )}
      </CardContent>
      {/* Optionally, you could add a caption or title overlay here if design requires */}
    </Card>
  );
};

export default BannerDisplay;
