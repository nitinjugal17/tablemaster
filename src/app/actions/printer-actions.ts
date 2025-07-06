'use server';

import type { PrinterSetting, InvoiceSetupSettings, PrintableInvoiceData, CurrencyCode, InvoiceSectionKey, PrintableInvoiceDataWithAdjustments } from '@/lib/types';
import { BASE_CURRENCY_CODE, DEFAULT_INVOICE_SECTION_ORDER } from '@/lib/types'; 
import { getConversionRates } from './data-management-actions'; 
import net from 'net';
import { format, parseISO } from 'date-fns'; 
import { generateInvoiceQuote } from '@/ai/flows/generate-invoice-quote';


interface TestPrintResult {
  success: boolean;
  message: string;
  details?: string;
}

async function convertPriceForPrint(priceInBase: number, displayCurrencyCode: CurrencyCode): Promise<number> {
  if (BASE_CURRENCY_CODE === displayCurrencyCode) {
    return priceInBase;
  }
  const conversionRates = await getConversionRates(); 
  const rate = conversionRates[BASE_CURRENCY_CODE]?.[displayCurrencyCode];
  
  if (rate) {
    return priceInBase * rate;
  }
  console.warn(`[Printer Action] Conversion rate from ${BASE_CURRENCY_CODE} to ${displayCurrencyCode} not found. Returning base price.`);
  return priceInBase; 
};

async function getFooterText1ForPrint(invoiceSetup: InvoiceSetupSettings, language?: 'en' | 'hi' | 'bn'): Promise<string | undefined> {
  if (invoiceSetup.autoGenerateInvoiceFooterQuote) {
    try {
      const aiQuoteResult = await generateInvoiceQuote({
        language: language || invoiceSetup.invoiceFooterQuoteLanguage || 'en',
        restaurantName: invoiceSetup.companyName,
      });
      return aiQuoteResult.quote;
    } catch (aiError) {
      console.error("AI Quote generation failed for thermal print:", aiError);
      return invoiceSetup.invoiceFooterText1; // Fallback to manual text
    }
  }
  return invoiceSetup.invoiceFooterText1;
}

const getCharsPerLine = (paperWidthStr: string): number => {
    const match = paperWidthStr.match(/^(\d+)(mm)?$/i);
    if (match && match[1]) {
        const widthMm = parseInt(match[1], 10);
        if (widthMm <= 58) return 32;
        if (widthMm <= 72) return 38; 
        if (widthMm <= 80) return 42; // Standard 80mm
        return 48; // Larger or unknown
    }
    // Fallbacks for common string values if regex fails
    if (paperWidthStr === '58mm') return 32;
    if (paperWidthStr === '104mm') return 48;
    return 42; // Default to 80mm equivalent
};

async function generateEscPosCommandsForInvoice(
  data: PrintableInvoiceDataWithAdjustments, 
  printerSettings: PrinterSetting
): Promise<Buffer> {
  const commands: (string | Buffer)[] = [];
  const { order, currencySymbol: displayCurrencySymbol, currencyCode: displayCurrencyCode, ...settings } = data;

  const charsPerLine = getCharsPerLine(printerSettings.paperWidth);
  const lineSeparator = '-'.repeat(charsPerLine) + '\n';

  const formatLine = (left: string, right: string, padChar: string = ' '): string => {
    const spaces = Math.max(0, charsPerLine - left.length - right.length);
    return `${left}${padChar.repeat(spaces)}${right}\n`;
  };
  
  const centerAlignCmd = Buffer.from([0x1B, 0x61, 0x01]);
  const leftAlignCmd = Buffer.from([0x1B, 0x61, 0x00]);
  
  const normalTextCmd = Buffer.from([0x1B, 0x21, 0x00]); // Normal size
  const doubleHeightCmd = Buffer.from([0x1B, 0x21, 0x10]); // Double height
  const doubleWidthCmd = Buffer.from([0x1B, 0x21, 0x20]); // Double width
  const doubleStrikeCmd = Buffer.from([0x1B, 0x21, 0x30]); // Double Height & Width
  
  const boldTextOnCmd = Buffer.from([0x1B, 0x45, 0x01]);
  const boldTextOffCmd = Buffer.from([0x1B, 0x45, 0x00]);

  commands.push(Buffer.from([0x1B, 0x40])); // Initialize Printer

  const sectionOrder: InvoiceSectionKey[] = settings.invoiceSectionOrder ? JSON.parse(settings.invoiceSectionOrder) : DEFAULT_INVOICE_SECTION_ORDER;
  const showCalculatedCost = settings.showCalculatedCostOnInvoiceAdmin || false;
  const showNutritionalInfo = settings.showNutritionalInfoOnInvoice || false;
  let totalCalculatedCostInBase = 0;

  for (const sectionKey of sectionOrder) {
    switch (sectionKey) {
      case 'companyHeader':
        if (settings.printElements.showLogo && settings.companyLogoUrl) {
             // commands.push(centerAlignCmd); commands.push("[Logo Area]\n"); 
        }
        if (settings.companyName) { commands.push(centerAlignCmd); commands.push(doubleStrikeCmd); commands.push(`${settings.companyName}\n`); commands.push(normalTextCmd); }
        if (settings.printElements.showCompanyAddress && settings.companyAddress) { commands.push(centerAlignCmd); commands.push(`${settings.companyAddress.substring(0, charsPerLine)}\n`); }
        if (settings.printElements.showCompanyPhone && settings.companyPhone) { commands.push(centerAlignCmd); commands.push(`Ph: ${settings.companyPhone}\n`); }
        commands.push(leftAlignCmd); 
        break;
      case 'invoiceHeader':
        if (settings.printElements.showInvoiceHeaderText && settings.invoiceHeaderText) { commands.push(centerAlignCmd); commands.push(boldTextOnCmd); commands.push(`${settings.invoiceHeaderText}\n`); commands.push(boldTextOffCmd); commands.push(leftAlignCmd); }
        break;
      case 'orderDetails':
        commands.push('\n');
        commands.push(lineSeparator);
        commands.push(centerAlignCmd); 
        commands.push(`Order ID: #${String(order.id).substring(0,10)}\n`);
        commands.push(`Date: ${format(parseISO(order.createdAt), "dd/MM/yy HH:mm")}\n`);
        commands.push(`Customer: ${order.customerName.substring(0, charsPerLine - 10)}\n`);
        if (order.orderType === 'Dine-in' && order.tableNumber) { commands.push(`Table: ${order.tableNumber} (${order.orderType})\n`); }
        else { commands.push(`Type: ${order.orderType}\n`); }
        if (order.paymentId && order.paymentType !== 'Pending') { commands.push(`Pmt ID: ${order.paymentId.substring(0, charsPerLine - 10)} (${order.paymentType})\n`); }
        if (order.paymentType === 'Pending') { commands.push(boldTextOnCmd); commands.push("PAYMENT PENDING\n"); commands.push(boldTextOffCmd); }
        commands.push(lineSeparator);
        commands.push(leftAlignCmd);
        break;
      case 'itemsTable':
        let itemHeaders = formatLine("Item(s)", "Total");
        if (showCalculatedCost) itemHeaders = formatLine("Item(s) (Cost)", "Total");
        commands.push(boldTextOnCmd); commands.push(itemHeaders); commands.push(formatLine(`(Qty x Price)`, "")); commands.push(boldTextOffCmd);
        commands.push(lineSeparator);
        for (const item of order.items) {
          const itemPriceInDisplay = await convertPriceForPrint(item.price, displayCurrencyCode);
          const itemTotalInDisplay = itemPriceInDisplay * item.quantity;
          let itemNameLine = item.name; if (itemNameLine.length > charsPerLine -15) itemNameLine = itemNameLine.substring(0, charsPerLine - 18) + "...";
          if (showCalculatedCost && item.currentCalculatedCost !== undefined) {
            itemNameLine += ` (${BASE_CURRENCY_CODE}${item.currentCalculatedCost.toFixed(2)})`;
            totalCalculatedCostInBase += item.currentCalculatedCost * item.quantity;
          }
          commands.push(`${itemNameLine}\n`);
          const qtyPriceStr = `  ${item.quantity} x ${displayCurrencySymbol}${itemPriceInDisplay.toFixed(2)}`;
          const itemTotalStr = `${displayCurrencySymbol}${itemTotalInDisplay.toFixed(2)}`;
          commands.push(formatLine(qtyPriceStr, itemTotalStr));
          if(item.note) { commands.push(`  Note: ${item.note.substring(0, charsPerLine - 8)}\n`); }

          if (showNutritionalInfo) {
            let nutritionForItem = '';
            if (item.calories) nutritionForItem += `Cal:${item.calories} `;
            if (item.carbs) nutritionForItem += `C:${item.carbs}g `;
            if (item.protein) nutritionForItem += `P:${item.protein}g `;
            if (item.fat) nutritionForItem += `F:${item.fat}g`;
            if (item.energyKJ) nutritionForItem += ` (${item.energyKJ}kJ)`;
            nutritionForItem = nutritionForItem.trim();
            if (nutritionForItem) {
                commands.push(`  Nutri: ${nutritionForItem.substring(0, charsPerLine - 10)}\n`);
                if (item.servingSizeSuggestion) commands.push(`  (${item.servingSizeSuggestion.substring(0, charsPerLine-5)})\n`);
            }
          }
        }
        commands.push(lineSeparator);
        break;
      case 'totals':
        const subtotalBeforeDiscount = await convertPriceForPrint(order.total, displayCurrencyCode);
        let discountAmount = 0;
        let discountLine = '';
        if (data.discount && data.discount.value > 0) {
            if (data.discount.type === 'percentage') {
                discountAmount = subtotalBeforeDiscount * (data.discount.value / 100);
                discountLine = formatLine(`Discount (${data.discount.value}%):`, `-${displayCurrencySymbol}${discountAmount.toFixed(2)}`);
            } else {
                discountAmount = await convertPriceForPrint(data.discount.value, displayCurrencyCode);
                discountLine = formatLine(`Discount:`, `-${displayCurrencySymbol}${discountAmount.toFixed(2)}`);
            }
        }
        const subtotalInDisplay = Math.max(0, subtotalBeforeDiscount - discountAmount);

        const gstPercentage = settings.gstPercentage || 0; const vatPercentage = settings.vatPercentage || 0; const cessPercentage = settings.cessPercentage || 0;
        const gstAmount = subtotalInDisplay * (gstPercentage / 100); const vatAmount = subtotalInDisplay * (vatPercentage / 100);
        const taxableForCess = subtotalInDisplay + gstAmount + vatAmount; const cessAmount = taxableForCess * (cessPercentage / 100);
        const grandTotalInDisplay = subtotalInDisplay + gstAmount + vatAmount + cessAmount;
        
        commands.push(formatLine("Subtotal:", `${displayCurrencySymbol}${subtotalInDisplay.toFixed(2)}`)); // Show subtotal after discount
        if(discountAmount > 0) commands.push(discountLine);

        if (gstAmount > 0) { commands.push(formatLine(`GST (${gstPercentage}%):`, `${displayCurrencySymbol}${gstAmount.toFixed(2)}`)); }
        if (vatAmount > 0) { commands.push(formatLine(`VAT (${vatPercentage}%):`, `${displayCurrencySymbol}${vatAmount.toFixed(2)}`)); }
        if (cessAmount > 0) { commands.push(formatLine(`Cess (${cessPercentage}%):`, `${displayCurrencySymbol}${cessAmount.toFixed(2)}`)); }
        commands.push(boldTextOnCmd); commands.push(doubleHeightCmd); commands.push(formatLine("TOTAL:", `${displayCurrencySymbol}${grandTotalInDisplay.toFixed(2)}`)); commands.push(normalTextCmd); commands.push(boldTextOffCmd);
        if (showCalculatedCost && totalCalculatedCostInBase > 0) {
          commands.push(formatLine("Total Cost:", `${BASE_CURRENCY_CODE} ${totalCalculatedCostInBase.toFixed(2)}`));
        }
        commands.push(leftAlignCmd); commands.push('\n');
        break;
      case 'taxInfo':
        if ((settings.printElements.showPanNumber && settings.panNumber) || (settings.printElements.showGstNumber && settings.gstNumber) || (settings.printElements.showFssaiNumber && settings.fssaiNumber)) {
          commands.push(lineSeparator);
          commands.push(centerAlignCmd);
          if (settings.printElements.showPanNumber && settings.panNumber) commands.push(`PAN: ${settings.panNumber}\n`);
          if (settings.printElements.showGstNumber && settings.gstNumber) commands.push(`GSTIN: ${settings.gstNumber}\n`);
          if (settings.printElements.showFssaiNumber && settings.fssaiNumber) commands.push(`FSSAI: ${settings.fssaiNumber}\n`);
          commands.push(leftAlignCmd); commands.push('\n');
        }
        break;
      case 'qrCodeOrder':
        if (settings.printElements.showScanForOrderQR && settings.scanForOrderQRUrl) {
           commands.push(lineSeparator); commands.push(centerAlignCmd);
           commands.push("Scan for Menu/Order\n"); // QR Code image printing is complex for thermal printers, so text is used
           commands.push(leftAlignCmd); commands.push('\n');
        }
        break;
      case 'qrCodePay':
        if (settings.printElements.showScanForPayQR && settings.scanForPayQRUrl) {
           commands.push(centerAlignCmd);
           commands.push("Scan to Pay\n");
           commands.push(leftAlignCmd); commands.push('\n');
        }
        break;
      case 'footerText1':
        const footerText1ToUse = await getFooterText1ForPrint(data, data.language);
        if (settings.printElements.showInvoiceFooterText1 && footerText1ToUse) { commands.push(lineSeparator); commands.push(centerAlignCmd); commands.push(`${footerText1ToUse.substring(0, charsPerLine)}\n`); }
        break;
      case 'footerText2':
        if (settings.printElements.showInvoiceFooterText2 && settings.invoiceFooterText2) { commands.push(centerAlignCmd); commands.push(`${settings.invoiceFooterText2.substring(0, charsPerLine)}\n`); }
        break;
      case 'closingMessage':
        commands.push(lineSeparator); commands.push(centerAlignCmd); commands.push(boldTextOnCmd); commands.push("Thank you for your visit!\n"); commands.push(boldTextOffCmd); commands.push(leftAlignCmd);
        break;
    }
  }
  
  commands.push('\n'); 
  const feedLines = parseInt(printerSettings.linesBeforeCut || "3", 10);
  if (!isNaN(feedLines) && feedLines > 0) { for (let i = 0; i < feedLines; i++) { commands.push('\n'); } }
  if (printerSettings.autoCut === 'partial_cut') { commands.push(Buffer.from([0x1D, 0x56, 0x42, 0x00])); }
  else if (printerSettings.autoCut === 'full_cut') { commands.push(Buffer.from([0x1D, 0x56, 0x41, 0x00])); }
  if (printerSettings.openCashDrawer === 'after_print') { commands.push(Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA])); }
  else if (printerSettings.openCashDrawer === 'before_print') { commands.unshift(Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA])); }

  return Buffer.concat(commands.map(cmd => typeof cmd === 'string' ? Buffer.from(cmd, 'ascii') : cmd));
}


export async function sendTestPrintCommand({
  printer,
  invoiceData, 
}: {
  printer: PrinterSetting;
  invoiceData: PrintableInvoiceDataWithAdjustments; 
}): Promise<TestPrintResult> {
  console.log('[Printer Action] Received print command for:', printer.name);
  console.log('[Printer Action] Using Display Currency Symbol:', invoiceData.currencySymbol, 'Code:', invoiceData.currencyCode);
  console.log('[Printer Action] Fetching current global conversion rates for this server-side print action.');
  
  if (printer.connectionType === 'system') {
    return {
      success: true,
      message: "System Printer selected. Printing is handled by the OS print dialog (Ctrl/Cmd+P on invoice preview).",
      details: "No direct backend print command sent for 'system' type printers."
    };
  }

  if (printer.connectionType !== 'network') {
    const message = `Direct backend print test is primarily for network printers. For ${printer.connectionType} printers, printing is usually done via system print dialogs or specific SDKs if available. This mock test will not attempt a connection.`;
    return {
      success: true, 
      message: message,
      details: "No actual print attempt made for non-network printer from backend."
    };
  }

  const { ipAddress, port } = printer;
  if (!ipAddress || !port) {
    return { success: false, message: 'Network printer IP address or port is not configured.' };
  }
  const portNumber = parseInt(port, 10);
  if (isNaN(portNumber)) {
    return { success: false, message: `Invalid port number: ${port}. Must be a number.` };
  }

  const escPosBuffer = await generateEscPosCommandsForInvoice(invoiceData, printer);
  
  return new Promise((resolve) => {
    const client = new net.Socket();
    let connectionError = '';
    const timeoutDuration = 5000; 
    let promiseSettled = false;

    const settlePromise = (result: TestPrintResult) => {
      if (!promiseSettled) {
        promiseSettled = true;
        if (!client.destroyed) client.destroy(); 
        resolve(result);
      }
    };

    client.setTimeout(timeoutDuration);

    client.on('connect', () => {
      client.write(escPosBuffer, (err) => {
        if (err) {
          connectionError = `Failed to send data: ${err.message}`;
          settlePromise({ success: false, message: `Error sending data to ${printer.name}.`, details: connectionError });
        } else {
          client.end(() => {
            settlePromise({ success: true, message: `Print command sent to ${printer.name}.`, details: `Sent ${escPosBuffer.length} bytes. Connection closed.` });
          });
          setTimeout(() => { 
            if (!promiseSettled) settlePromise({ success: true, message: `Print command sent to ${printer.name}, but client.end() confirmation timed out.`, details: `Sent ${escPosBuffer.length} bytes.` });
          }, 2000); 
        }
      });
    });

    client.on('timeout', () => {
      connectionError = 'Connection/Write timed out.';
      settlePromise({ success: false, message: `Connection to ${printer.name} timed out.`, details: connectionError });
    });

    client.on('error', (err: NodeJS.ErrnoException) => {
      connectionError = `Network error: ${err.message} (Code: ${err.code}).`;
      settlePromise({ success: false, message: `Network error connecting to ${printer.name}.`, details: connectionError });
    });

    client.on('close', (hadError) => {
      if (!promiseSettled) {
        settlePromise({ success: false, message: `Connection to ${printer.name} closed unexpectedly.`, details: connectionError || (hadError ? "Closed due to an error." : "Closed before operation completed.") });
      }
    });
    client.connect(portNumber, ipAddress);
  });
}
