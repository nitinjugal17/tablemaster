
"use client"; 

import Link from 'next/link';
import { ChefHat } from 'lucide-react';
import Image from 'next/image'; 
import { useGeneralSettings } from '@/context/GeneralSettingsContext'; 

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  imageUrl?: string | null; 
  altText?: string;
}

const Logo = ({ size = 'md', imageUrl, altText }: LogoProps) => {
  const { settings: generalSettings, isLoadingSettings } = useGeneralSettings();

  // Define sizes
  let textSizeClass = 'text-3xl'; // Default for md
  let iconSize = 32; // Default for md
  let imageWidth = 180; // Default image width for md
  let imageHeight = 50; // Default image height for md

  if (size === 'lg') {
    textSizeClass = 'text-5xl';
    iconSize = 48;
    imageWidth = 220;
    imageHeight = 60;
  } else if (size === 'sm') {
    textSizeClass = 'text-2xl';
    iconSize = 28;
    imageWidth = 160;
    imageHeight = 45;
  }
  
  const companyName = isLoadingSettings ? "Loading..." : (generalSettings.companyName || "TableMaster");
  const effectiveAltText = altText || `${companyName} Logo`;

  return (
    <Link href="/" className="flex items-center gap-2 text-primary transition-transform duration-200 ease-in-out hover:scale-105" aria-label={`${companyName} homepage`}>
      {imageUrl ? (
        <Image 
          src={imageUrl} 
          alt={effectiveAltText} 
          width={imageWidth} 
          height={imageHeight} 
          className="object-contain h-auto w-auto"
          data-ai-hint="company logo" 
          priority // Consider if logo is LCP
        />
      ) : (
        <>
          <ChefHat size={iconSize} strokeWidth={2.2} />
          <span className={`font-headline font-bold ${textSizeClass}`}>{companyName}</span>
        </>
      )}
    </Link>
  );
};

export default Logo;
