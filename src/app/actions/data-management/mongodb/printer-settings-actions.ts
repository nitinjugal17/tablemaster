// src/app/actions/data-management/mongodb/printer-settings-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { PrinterSetting } from '@/lib/types';
import Papa from 'papaparse';
import { PRINTER_SETTINGS_HEADERS } from '../_csv-headers';

export async function getPrinterSettings(): Promise<PrinterSetting[]> {
  const { db } = await connectToDatabase();
  const printers = await db.collection('printer-settings').find({}).toArray();
  return printers.map(fromMongo) as PrinterSetting[];
}

export async function savePrinterSettings(printers: PrinterSetting[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('printer-settings').deleteMany({});
        if (printers.length > 0) {
            const printersWithObjectIds = printers.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
            }));
            const result = await db.collection('printer-settings').insertMany(printersWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} printer settings.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all printer settings.', count: 0 };
    } catch (error) {
        console.error("Error saving printer settings to MongoDB:", error);
        return { success: false, message: `Error saving printer settings to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadPrinterSettingsCsv(): Promise<string> {
    const printers = await getPrinterSettings();
    if (printers.length === 0) return PRINTER_SETTINGS_HEADERS;
    return Papa.unparse(printers, { header: true, columns: PRINTER_SETTINGS_HEADERS.trim().split(',') });
}

export async function uploadPrinterSettingsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedPrinters: PrinterSetting[] = parsed.data.map(p => ({
      id: String(p.id || crypto.randomUUID()),
      name: p.name || 'Unnamed Printer',
      connectionType: ['network', 'usb', 'bluetooth', 'system'].includes(p.connectionType) ? p.connectionType : 'network',
      ipAddress: p.connectionType === 'network' ? (p.ipAddress || '') : '',
      port: p.connectionType === 'network' ? (p.port || '') : '',
      paperWidth: String(p.paperWidth || '80mm'),
      autoCut: ['none', 'partial_cut', 'full_cut'].includes(p.autoCut) ? p.autoCut : 'none',
      linesBeforeCut: ['0','1','2','3','4','5'].includes(String(p.linesBeforeCut)) ? String(p.linesBeforeCut) as PrinterSetting['linesBeforeCut'] : '2',
      openCashDrawer: ['disabled', 'before_print', 'after_print'].includes(p.openCashDrawer) ? p.openCashDrawer : 'disabled',
      dpi: String(p.dpi || '203'),
    }));
    return savePrinterSettings(validatedPrinters);
}
