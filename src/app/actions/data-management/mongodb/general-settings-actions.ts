// src/app/actions/data-management/mongodb/general-settings-actions.ts
'use server';
import { connectToDatabase } from '@/lib/mongodb';
import type { InvoiceSetupSettings } from '@/lib/types';
import { defaultInvoiceSetupSettings } from '@/lib/types';

// Define a specific type for this document to handle string _id
interface GeneralSettingsDoc extends InvoiceSetupSettings {
  _id: 'general';
}

export async function getGeneralSettings(): Promise<InvoiceSetupSettings> {
  const { db } = await connectToDatabase();
  // Use the specific document type to inform TypeScript about the _id
  const settings = await db.collection<GeneralSettingsDoc>('settings').findOne({ _id: 'general' });
  
  if (settings) {
    const { _id, ...rest } = settings;
    return { ...defaultInvoiceSetupSettings, ...rest };
  }
  
  return defaultInvoiceSetupSettings;
}

export async function saveGeneralSettings(settings: InvoiceSetupSettings): Promise<{ success: boolean; message: string; }> {
  const { db } = await connectToDatabase();
    try {
        await db.collection<GeneralSettingsDoc>('settings').updateOne(
            { _id: 'general' },
            { $set: settings },
            { upsert: true }
        );
        return { success: true, message: "General settings saved successfully to MongoDB." };
    } catch (error) {
        console.error("Error saving general settings to MongoDB:", error);
        return { success: false, message: `Error saving general settings to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadGeneralSettingsCsv(): Promise<string> {
    throw new Error('MongoDB downloadGeneralSettingsCsv not implemented.');
}

export async function uploadGeneralSettingsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    throw new Error('MongoDB uploadGeneralSettingsCsv not implemented.');
}
