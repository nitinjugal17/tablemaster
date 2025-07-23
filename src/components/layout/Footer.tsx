
"use client";

import React from 'react';
import Logo from './Logo';
import Link from 'next/link';
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail } from 'lucide-react';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const Footer = () => {
  const { settings, isLoadingSettings } = useGeneralSettings();
  const currentYear = new Date().getFullYear();

  if (isLoadingSettings) {
    return (
      <footer className="bg-muted/50 text-muted-foreground py-12">
        <div className="container max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div><Skeleton className="h-8 w-32 mb-4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4 mt-2" /></div>
            <div><Skeleton className="h-6 w-24 mb-4" /><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-4 w-28 mb-2" /></div>
            <div><Skeleton className="h-6 w-32 mb-4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4 mt-2" /></div>
            <div><Skeleton className="h-6 w-24 mb-4" /><Skeleton className="h-32 w-full" /><Skeleton className="h-4 w-full mt-2" /></div>
          </div>
          <div className="mt-12 border-t border-border pt-8 text-center text-sm"><Skeleton className="h-4 w-64 mx-auto" /></div>
        </div>
      </footer>
    );
  }

  const companyName = settings.companyName || "TableMaster";
  const copyrightText = settings.footerCopyrightText
    ? settings.footerCopyrightText.replace('{year}', currentYear.toString()).replace('{companyName}', companyName)
    : `© ${currentYear} ${companyName}. All rights reserved. Crafted with passion.`;

  const gmapsQuery = encodeURIComponent(settings.companyAddress || settings.companyName || "Restaurant");
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${gmapsQuery}`;

  return (
    <footer className="bg-muted/50 text-muted-foreground py-12">
      <div className="container max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Column 1: Logo & About */}
          <div className="space-y-4">
            <Logo size="sm" />
            <p className="text-sm">
              {settings.footerAboutText || "Savor the moments, one dish at a time. TableMaster helps you connect with your favorite culinary experiences."}
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="font-headline text-lg font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/menu" className="hover:text-primary transition-colors">Our Menu</Link></li>
              <li><Link href="/bookings" className="hover:text-primary transition-colors">Book a Table</Link></li>
              <li><Link href="/rooms" className="hover:text-primary transition-colors">Book a Room</Link></li>
              <li><Link href="/orders" className="hover:text-primary transition-colors">My Orders</Link></li>
              <li><Link href="/feedback" className="hover:text-primary transition-colors">Give Feedback</Link></li>
              <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="/terms-and-conditions" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/disclaimer" className="hover:text-primary transition-colors">Disclaimer</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact Us & Social */}
          <div>
            <h3 className="font-headline text-lg font-semibold text-foreground mb-4">Contact & Connect</h3>
            <ul className="space-y-3 text-sm">
              {settings.companyPhone && (
                <li className="flex items-center">
                  <Phone className="mr-2 h-4 w-4 text-accent" />
                  <a href={`tel:${settings.companyPhone}`} className="hover:text-primary transition-colors">{settings.companyPhone}</a>
                </li>
              )}
              {settings.footerContactEmail && (
                <li className="flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-accent" />
                  <a href={`mailto:${settings.footerContactEmail}`} className="hover:text-primary transition-colors">{settings.footerContactEmail}</a>
                </li>
              )}
            </ul>
            <Button variant="outline" size="sm" asChild className="mt-4 w-full sm:w-auto">
              <Link href="/contact">Send us a Message</Link>
            </Button>
            <div className="flex space-x-4 mt-6">
              {settings.footerFacebookUrl && <Link href={settings.footerFacebookUrl} aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Facebook size={24} /></Link>}
              {settings.footerInstagramUrl && <Link href={settings.footerInstagramUrl} aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Instagram size={24} /></Link>}
              {settings.footerTwitterUrl && <Link href={settings.footerTwitterUrl} aria-label="Twitter" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={24} /></Link>}
            </div>
          </div>
          
          {/* Column 4: Locate Us */}
          <div>
            <h3 className="font-headline text-lg font-semibold text-foreground mb-4">Locate Us</h3>
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" aria-label="View on Google Maps">
              <div className="relative aspect-[4/3] w-full max-w-xs rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <Image
                  src="https://placehold.co/300x225.png?text=Our+Location"
                  alt="Map placeholder"
                  fill
                  sizes="(max-width: 640px) 100vw, 25vw"
                  className="object-cover"
                  data-ai-hint="map location"
                />
              </div>
            </a>
            {settings.companyAddress && (
              <p className="mt-3 text-sm">
                <MapPin className="inline mr-1.5 h-4 w-4 text-accent" />
                {settings.companyAddress}
              </p>
            )}
          </div>

        </div>
        <div className="mt-12 border-t border-border pt-8 text-center text-sm">
          <p>{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
