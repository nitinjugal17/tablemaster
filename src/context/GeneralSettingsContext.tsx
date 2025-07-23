
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { InvoiceSetupSettings } from '@/lib/types';
import { defaultInvoiceSetupSettings } from '@/lib/types';
import { getGeneralSettings } from '@/app/actions/data-management-actions';

interface GeneralSettingsContextType {
  settings: InvoiceSetupSettings;
  isLoadingSettings: boolean;
  refreshGeneralSettings: () => Promise<void>;
}

const GeneralSettingsContext = createContext<GeneralSettingsContextType | undefined>(undefined);

interface GeneralSettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: InvoiceSetupSettings | null;
}

export const GeneralSettingsProvider: React.FC<GeneralSettingsProviderProps> = ({ children, initialSettings }) => {
  const [settings, setSettings] = useState<InvoiceSetupSettings>(initialSettings || defaultInvoiceSetupSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(!initialSettings);

  const refreshGeneralSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
        const fetchedSettings = await getGeneralSettings();
        setSettings(fetchedSettings);
    } catch (error) {
        console.error("Failed to refresh general settings:", error);
        // Don't fall back to default, keep existing state on error
    } finally {
        setIsLoadingSettings(false);
    }
  }, []);

  // Update settings if the initial prop changes (e.g., on re-navigation)
  useEffect(() => {
    if (initialSettings) {
        setSettings(initialSettings);
        setIsLoadingSettings(false);
    }
  }, [initialSettings]);


  const contextValue = useMemo(() => ({
    settings,
    isLoadingSettings,
    refreshGeneralSettings
  }), [settings, isLoadingSettings, refreshGeneralSettings]);

  return (
    <GeneralSettingsContext.Provider value={contextValue}>
      {children}
    </GeneralSettingsContext.Provider>
  );
};

export const useGeneralSettings = (): GeneralSettingsContextType => {
  const context = useContext(GeneralSettingsContext);
  if (context === undefined) {
    throw new Error('useGeneralSettings must be used within a GeneralSettingsProvider');
  }
  return context;
};
