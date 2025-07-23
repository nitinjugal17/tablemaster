// src/context/I18nProvider.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // On the server or during initial client render, return null or a loading fallback.
    // This ensures the client-side language detection doesn't cause a mismatch with the server.
    return null; 
  }

  // Once mounted on the client, render the full provider.
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
