
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { InvoiceSetupSettings } from '@/lib/types';
import { defaultInvoiceSetupSettings } from '@/lib/types';
import { getGeneralSettings as getGeneralSettingsAction } from '@/app/actions/data-management-actions';

interface GeneralSettingsContextType {
  settings: InvoiceSetupSettings;
  isLoadingSettings: boolean;
  refreshGeneralSettings: () => Promise<void>;
}

const GeneralSettingsContext = createContext<GeneralSettingsContextType | undefined>(undefined);

export const GeneralSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<InvoiceSetupSettings>(defaultInvoiceSetupSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const fetchedSettings = await getGeneralSettingsAction();
      setSettings(fetchedSettings);
    } catch (error) {
      console.error("Failed to fetch general settings:", error);
      setSettings(defaultInvoiceSetupSettings); // Fallback to defaults on error
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const contextValue = useMemo(() => ({
    settings,
    isLoadingSettings,
    refreshGeneralSettings: fetchSettings
  }), [settings, isLoadingSettings, fetchSettings]);

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
