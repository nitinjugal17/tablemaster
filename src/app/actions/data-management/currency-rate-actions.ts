// src/app/actions/data-management/currency-rate-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from './_csv-base-actions';
import { CONVERSION_RATES_HEADERS } from './_csv-headers';
import type { CurrencyCode, ConversionRates } from '@/lib/types';
import { BASE_CURRENCY_CODE, DEFAULT_CONVERSION_RATES, currencyOptions } from '@/lib/types';

const conversionRatesCsvPath = path.join(dataDir, 'conversion-rates.csv');

interface CsvRateRow {
  targetCurrencyCode: CurrencyCode;
  rate: number;
}

export async function getConversionRates(): Promise<ConversionRates> {
  try {
    const csvData = await readCsvFile<CsvRateRow>(conversionRatesCsvPath, CONVERSION_RATES_HEADERS);
    if (csvData.length === 0) {
      console.log('[Currency Rate Action] conversion-rates.csv is empty or not found, returning default rates.');
      return DEFAULT_CONVERSION_RATES;
    }

    const rates: ConversionRates = {
      [BASE_CURRENCY_CODE]: {
        [BASE_CURRENCY_CODE]: 1, 
      },
    };

    for (const row of csvData) {
      if (row.targetCurrencyCode && typeof row.rate === 'number' && rates[BASE_CURRENCY_CODE]) {
        rates[BASE_CURRENCY_CODE]![row.targetCurrencyCode] = row.rate;
      }
    }
    
    currencyOptions.forEach(option => {
      if (option.code !== BASE_CURRENCY_CODE) {
        if (!rates[BASE_CURRENCY_CODE]?.[option.code] && DEFAULT_CONVERSION_RATES[BASE_CURRENCY_CODE]?.[option.code]) {
          rates[BASE_CURRENCY_CODE]![option.code] = DEFAULT_CONVERSION_RATES[BASE_CURRENCY_CODE]![option.code];
        }
      }
    });

    return rates;
  } catch (error) {
    console.error('[Currency Rate Action] Error reading conversion-rates.csv, returning default rates:', (error as Error).message);
    return DEFAULT_CONVERSION_RATES;
  }
}

export async function saveConversionRates(ratesObject: Partial<Record<CurrencyCode, number>>): Promise<{ success: boolean; message: string; count?: number }> {
  console.log('[Currency Rate Action] Attempting to save conversion rates CSV.');
  try {
    const dataForCsv: CsvRateRow[] = [];
    for (const key in ratesObject) {
      const currencyCode = key as CurrencyCode;
      if (currencyCode !== BASE_CURRENCY_CODE) { 
        dataForCsv.push({ targetCurrencyCode: currencyCode, rate: ratesObject[currencyCode]! });
      }
    }
    const csvHeaders = CONVERSION_RATES_HEADERS.trim().split(',');
    return overwriteCsvFile(conversionRatesCsvPath, dataForCsv, csvHeaders);
  } catch (error) {
    console.error(`[Currency Rate Action] Error processing/saving rates CSV: ${(error as Error).message}`);
    return { success: false, message: `Error processing/saving rates CSV: ${(error as Error).message}` };
  }
}

export async function downloadConversionRatesCsv(): Promise<string> {
  try {
    const rates = await getConversionRates(); 
    if (!rates[BASE_CURRENCY_CODE]) return CONVERSION_RATES_HEADERS;

    const dataForCsv: CsvRateRow[] = [];
    const baseRates = rates[BASE_CURRENCY_CODE];
    for (const key in baseRates) {
      const targetCode = key as CurrencyCode;
      if (targetCode !== BASE_CURRENCY_CODE) { 
         dataForCsv.push({ targetCurrencyCode: targetCode, rate: baseRates[targetCode]! });
      }
    }
    if (dataForCsv.length === 0) return CONVERSION_RATES_HEADERS;
    const csvHeaders = CONVERSION_RATES_HEADERS.trim().split(',');
    return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
  } catch (error) {
    console.error(`[Currency Rate Action] Error generating ConversionRates CSV for download: ${(error as Error).message}`);
    return CONVERSION_RATES_HEADERS;
  }
}

export async function uploadConversionRatesCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const parsed = Papa.parse<CsvRateRow>(csvString, {
      header: true,
      dynamicTyping: true, 
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
      return { success: false, message: `CSV parsing errors: ${errorMessages}. File not saved.` };
    }

    const ratesToSave: Partial<Record<CurrencyCode, number>> = {};
    parsed.data.forEach(row => {
      if (row.targetCurrencyCode && typeof row.rate === 'number' && currencyOptions.find(opt => opt.code === row.targetCurrencyCode)) {
        if (row.targetCurrencyCode !== BASE_CURRENCY_CODE) {
           ratesToSave[row.targetCurrencyCode] = row.rate;
        }
      } else {
        console.warn(`[Currency Rate Action] Skipping invalid row in conversion rates CSV upload:`, row);
      }
    });
    
    return saveConversionRates(ratesToSave);

  } catch (error) {
    console.error(`[Currency Rate Action] Error processing uploaded rates CSV: ${(error as Error).message}`);
    return { success: false, message: `Error processing uploaded rates CSV: ${(error as Error).message}` };
  }
}
