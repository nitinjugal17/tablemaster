
"use client";
import { useState, useEffect } from 'react';
import type { InvoiceSetupSettings, CurrencyCode, CurrencySymbol } from '@/lib/types';
import { defaultInvoiceSetupSettings, BASE_CURRENCY_CODE, currencyOptions } from '@/lib/types';
import { useCurrencyRates } from '@/context/CurrencyRatesContext'; 
import { useGeneralSettings } from '@/context/GeneralSettingsContext';

export function useCurrency() {
  const { settings: generalSettings, isLoadingSettings: isLoadingGeneralSettings } = useGeneralSettings();
  const { rates: globalConversionRates, isLoadingRates: isLoadingContextRates, refreshRates } = useCurrencyRates();

  const displayCurrencyCode = generalSettings.currencyCode || defaultInvoiceSetupSettings.currencyCode;
  const displayCurrencySymbol = generalSettings.currencySymbol || defaultInvoiceSetupSettings.currencySymbol;
  
  const convertPrice = (priceInBase: number, targetDisplayCodeParam?: CurrencyCode): number => {
    const target = targetDisplayCodeParam || displayCurrencyCode; 
    
    if (BASE_CURRENCY_CODE === target || isLoadingContextRates) { 
      return priceInBase;
    }
    
    const rate = globalConversionRates[BASE_CURRENCY_CODE]?.[target];
    
    if (rate) {
      return priceInBase * rate;
    }
    
    console.warn(`Conversion rate from ${BASE_CURRENCY_CODE} to ${target} not found. Returning original price.`);
    return priceInBase; 
  };

  const getSymbolForCode = (code: CurrencyCode): CurrencySymbol => {
    return currencyOptions.find(opt => opt.code === code)?.symbol || '₹'; 
  };

  return { 
    currencySymbol: displayCurrencySymbol, 
    currencyCode: displayCurrencyCode, 
    convertPrice, 
    conversionRates: globalConversionRates, 
    isLoadingConversionRates: isLoadingContextRates,
    isLoadingDisplayCurrency: isLoadingGeneralSettings,
    refreshConversionRates: refreshRates, 
    getSymbolForCode 
  };
}
