
// src/app/actions/data-management/printer-settings-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from './_csv-base-actions';
import { PRINTER_SETTINGS_HEADERS } from './_csv-headers';
import type { PrinterSetting } from '@/lib/types';

const printerSettingsCsvPath = path.join(dataDir, 'printer-settings.csv');

export async function getPrinterSettings(): Promise<PrinterSetting[]> {
  const rawData = await readCsvFile<any>(printerSettingsCsvPath, PRINTER_SETTINGS_HEADERS);
  return rawData.map(printer => ({
    id: String(printer.id || crypto.randomUUID()),
    name: printer.name || 'Unnamed Printer',
    connectionType: ['network', 'usb', 'bluetooth', 'system'].includes(printer.connectionType) ? printer.connectionType : 'network',
    ipAddress: printer.connectionType === 'network' ? (printer.ipAddress || '') : '',
    port: printer.connectionType === 'network' ? (printer.port || '') : '',
    paperWidth: String(printer.paperWidth || '80mm'),
    autoCut: ['none', 'partial_cut', 'full_cut'].includes(printer.autoCut) ? printer.autoCut : 'none',
    linesBeforeCut: ['0','1','2','3','4','5'].includes(String(printer.linesBeforeCut)) ? String(printer.linesBeforeCut) as PrinterSetting['linesBeforeCut'] : '2',
    openCashDrawer: ['disabled', 'before_print', 'after_print'].includes(printer.openCashDrawer) ? printer.openCashDrawer : 'disabled',
    dpi: String(printer.dpi || '203'),
  }));
}

export async function savePrinterSettings(printers: PrinterSetting[]): Promise<{ success: boolean; message: string; count?: number }> {
  console.log('[Printer Settings Action] Attempting to save printer settings CSV.');
  const dataForCsv = printers.map(p => ({
    id: p.id || crypto.randomUUID(),
    name: p.name || 'Unnamed Printer',
    connectionType: p.connectionType || 'network',
    ipAddress: p.connectionType === 'network' ? (p.ipAddress || '') : '',
    port: p.connectionType === 'network' ? (p.port || '') : '',
    paperWidth: String(p.paperWidth || '80mm'),
    autoCut: p.autoCut || 'none',
    linesBeforeCut: p.linesBeforeCut || '2',
    openCashDrawer: p.openCashDrawer || 'disabled',
    dpi: String(p.dpi || '203'),
  }));
  const csvHeaders = PRINTER_SETTINGS_HEADERS.trim().split(',');
  return overwriteCsvFile(printerSettingsCsvPath, dataForCsv, csvHeaders);
}

export async function downloadPrinterSettingsCsv(): Promise<string> {
  try {
    const printers = await getPrinterSettings();
    if (printers.length === 0) return PRINTER_SETTINGS_HEADERS;
    const csvHeaders = PRINTER_SETTINGS_HEADERS.trim().split(',');
    return Papa.unparse(printers, { header: true, columns: csvHeaders });
  } catch (error) {
    console.error(`[Printer Settings Action] Error generating PrinterSettings CSV for download: ${(error as Error).message}`);
    return PRINTER_SETTINGS_HEADERS;
  }
}

export async function uploadPrinterSettingsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const parsed = Papa.parse<any>(csvString, {
      header: true,
      dynamicTyping: false, 
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
      return { success: false, message: `CSV parsing errors: ${errorMessages}. File not saved.` };
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
  } catch (error) {
    console.error(`[Printer Settings Action] Error processing PrinterSettings CSV upload: ${(error as Error).message}`);
    return { success: false, message: `Error processing uploaded printer settings CSV: ${(error as Error).message}` };
  }
}
