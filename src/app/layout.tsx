
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { CurrencyRatesProvider } from '@/context/CurrencyRatesContext';
import { GeneralSettingsProvider } from '@/context/GeneralSettingsContext';
import { AuthProvider } from '@/context/AuthContext';
import { AppI18nProvider } from '@/context/I18nProvider';
import { FirewallProvider } from '@/context/FirewallProvider';
import SystemStatusOverlay from '@/components/layout/SystemStatusOverlay';
import { OfflineSyncProvider } from '@/context/OfflineSyncProvider';
import React from 'react';

export const metadata: Metadata = {
  title: 'TableMaster', 
  description: 'Manage your restaurant with ease: bookings, orders, menu, and more. The ultimate restaurant management solution.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <React.Suspense fallback={<div>Loading...</div>}>
          <SystemStatusOverlay />
          <FirewallProvider>
            <AuthProvider> 
              <GeneralSettingsProvider>
                <CurrencyRatesProvider>
                  <AppI18nProvider>
                    <OfflineSyncProvider>
                      {children}
                    </OfflineSyncProvider>
                  </AppI18nProvider>
                </CurrencyRatesProvider>
              </GeneralSettingsProvider>
            </AuthProvider>
          </FirewallProvider>
          <Toaster />
        </React.Suspense>
      </body>
    </html>
  );
}
