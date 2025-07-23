"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ConversionRates } from '@/lib/types';
import { DEFAULT_CONVERSION_RATES } from '@/lib/types';
import { getConversionRates as getConversionRatesAction } from '@/app/actions/data-management-actions';

interface CurrencyRatesContextType {
  rates: ConversionRates;
  isLoadingRates: boolean;
  refreshRates: () => Promise<void>;
}

const CurrencyRatesContext = createContext<CurrencyRatesContextType | undefined>(undefined);

export const CurrencyRatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rates, setRates] = useState<ConversionRates>(DEFAULT_CONVERSION_RATES);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  const fetchRates = useCallback(async () => {
    setIsLoadingRates(true);
    try {
      if (getConversionRatesAction) {
        const fetchedRates = await getConversionRatesAction();
        setRates(fetchedRates);
      } else {
        console.error("getConversionRatesAction is not a function or is undefined.");
        setRates(DEFAULT_CONVERSION_RATES);
      }
    } catch (error) {
      console.error("Failed to fetch conversion rates:", error);
      setRates(DEFAULT_CONVERSION_RATES); // Fallback to defaults on error
    } finally {
      setIsLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return (
    <CurrencyRatesContext.Provider value={{ rates, isLoadingRates, refreshRates: fetchRates }}>
      {children}
    </CurrencyRatesContext.Provider>
  );
};

export const useCurrencyRates = (): CurrencyRatesContextType => {
  const context = useContext(CurrencyRatesContext);
  if (context === undefined) {
    throw new Error('useCurrencyRates must be used within a CurrencyRatesProvider');
  }
  return context;
};
