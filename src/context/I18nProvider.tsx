// src/context/I18nProvider.tsx
"use client";

import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n'; // Your i18next configuration

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  // Ensure i18n is initialized before rendering children
  // This is often handled within i18n.ts, but a check here or loading state can be useful
  if (!i18n.isInitialized) {
    // You could return a loading spinner here if initialization is async
    // and takes noticeable time, though for typical setups it's fast.
    // For this example, we assume i18n.ts initializes synchronously enough.
  }
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
