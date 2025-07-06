// src/app/actions/data-management/mongodb/currency-rate-actions.ts
'use server';
import { connectToDatabase } from '@/lib/mongodb';
import type { CurrencyCode, ConversionRates } from '@/lib/types';
import { DEFAULT_CONVERSION_RATES, BASE_CURRENCY_CODE } from '@/lib/types';

// Define a specific type for the document in the settings collection
interface SettingsRateDoc {
    _id: 'conversionRates';
    rates: ConversionRates;
}

export async function getConversionRates(): Promise<ConversionRates> {
  const { db } = await connectToDatabase();
  // Use the specific document type to inform TypeScript about the _id
  const ratesDoc = await db.collection<SettingsRateDoc>('settings').findOne({ _id: 'conversionRates' });

  if (ratesDoc) {
    return ratesDoc.rates || DEFAULT_CONVERSION_RATES;
  }
  return DEFAULT_CONVERSION_RATES;
}

export async function saveConversionRates(ratesObject: Partial<Record<CurrencyCode, number>>): Promise<{ success: boolean; message: string; count?: number }> {
  const { db } = await connectToDatabase();
  try {
      const fullRatesObject: ConversionRates = {
        [BASE_CURRENCY_CODE]: {
          ...ratesObject,
          [BASE_CURRENCY_CODE]: 1,
        }
      };

      await db.collection<SettingsRateDoc>('settings').updateOne(
        { _id: 'conversionRates' },
        { $set: { rates: fullRatesObject } },
        { upsert: true }
      );
    return { success: true, message: "Conversion rates saved successfully to MongoDB.", count: Object.keys(ratesObject).length };
  } catch(error) {
     console.error("Error saving conversion rates to MongoDB:", error);
     return { success: false, message: `Error saving conversion rates to MongoDB: ${(error as Error).message}` };
  }
}

export async function downloadConversionRatesCsv(): Promise<string> {
  throw new Error('MongoDB downloadConversionRatesCsv not implemented.');
}

export async function uploadConversionRatesCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  throw new Error('MongoDB uploadConversionRatesCsv not implemented.');
}
