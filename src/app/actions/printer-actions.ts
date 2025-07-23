
// src/app/actions/printer-actions.ts
'use server';

import { sendEmail } from '@/lib/emailService';
import type { PrinterSetting, InvoiceSetupSettings, PrintableInvoiceData, CurrencyCode, InvoiceSectionKey, PrintableInvoiceDataWithAdjustments, OrderItem, Order, PrintableKOTData, OrderStatus } from '@/lib/types';
import { BASE_CURRENCY_CODE, DEFAULT_INVOICE_SECTION_ORDER } from '@/lib/types'; 
import { getConversionRates, getGeneralSettings } from './data-management-actions'; 
import net from 'net';
import { format, parseISO, isValid, differenceInHours, differenceInMinutes } from 'date-fns'; 
import { generateInvoiceQuote } from '@/ai/flows/generate-invoice-quote';


interface TestPrintResult {
  success: boolean;
  message: string;
  details?: string;
}

// Define LanguageCode as a literal type to break the circular dependency.
type LanguageCode = 'en' | 'hi' | 'bn';

// This function is no longer needed here as the logic is passed from the client
// but we'll keep a version of it for server-only logic like KOT printing if needed.
const getLabelsForKOT = (lang: LanguageCode = 'en'): Record<string, string> => ({
  // Simplified for KOT
  orderId: "Order ID:",
  table: "Table:",
  orderType: "Order Type:",
  notes: "ORDER NOTES:",
  items: "Item(s):"
});


async function convertPriceForPrint(priceInBase: number, displayCurrencyCode: CurrencyCode): Promise<number> {
    if (BASE_CURRENCY_CODE === displayCurrencyCode) {
        return priceInBase;
    }
    const conversionRates = await getConversionRates();
    const rate = conversionRates[BASE_CURRENCY_CODE]?.[displayCurrencyCode];
    if (rate) {
        return priceInBase * rate;
    }
    // This is a critical failure. Throw an error to prevent generating an incorrect invoice.
    console.error(`[CRITICAL] Conversion rate from ${BASE_CURRENCY_CODE} to ${displayCurrencyCode} not found. Cannot generate correct pricing.`);
    throw new Error(`Conversion rate not found for ${displayCurrencyCode}.`);
}


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
    if (paperWidthStr === '58mm') return 32;
    return 42; // Default for 80mm
};

// New function for KOT command generation
async function generateKOTEscPosCommands(
  data: PrintableKOTData,
  printerSettings: PrinterSetting
): Promise<string> {
    let commands = '';
    const isConsolidated = !!data.orders;
    const orders = isConsolidated ? data.orders! : [data.order!];
    
    const charsPerLine = getCharsPerLine(printerSettings.paperWidth);
    const lineSeparator = '-'.repeat(charsPerLine) + '\n';
    
    // KOT Header
    commands += `\n[CENTER][BIG]${isConsolidated ? 'CONSOLIDATED KOT' : 'KOT'}[/BIG]\n`;
    commands += `[CENTER]Time: ${format(new Date(), "HH:mm:ss")}\n`;
    
    if (isConsolidated) {
        const totalItemCount = orders.reduce((total: number, order: Order) => {
            const items: OrderItem[] = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []);
            return total + items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);
        commands += `[CENTER][BOLD]Total Pending Items: ${totalItemCount}\n`;
    }
    
    commands += lineSeparator;

    for (const order of orders) {
      if (isConsolidated) {
        commands += `[BOLD]Order #${String(order.id).substring(0, 8)} (${order.tableNumber || order.orderType})\n`;
      } else {
        if (order.orderType === 'Dine-in' && order.tableNumber) {
            commands += `[BIG][BOLD]Table: ${order.tableNumber}\n`;
        } else {
            commands += `[BIG][BOLD]${order.orderType}\n`;
        }
        commands += `Order ID: #${String(order.id).substring(0, 8)}\n`;
        const createdAtDate = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : new Date(order.createdAt);
        if (isValid(createdAtDate)) {
            commands += `Placed: ${format(createdAtDate, "HH:mm:ss")}\n`;
        }
      }
      
      // Overall Order Notes for single KOT
      if (!isConsolidated && order.notes) {
          commands += `[BOLD]ORDER NOTES:\n[NORMAL]${order.notes}\n`;
      }

      // Items
      const orderItemsArray: OrderItem[] = Array.isArray(order.items)
        ? order.items
        : typeof order.items === 'string' && order.items.startsWith('[')
        ? JSON.parse(order.items)
        : [];
        
      orderItemsArray.forEach(item => {
        const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed"
                                ? `${item.name} (${item.selectedPortion})`
                                : item.name;
        commands += `[BIG]${item.quantity}x ${itemDisplayName}\n`;
        if (item.note) {
          commands += `  [BOLD]NOTE: ${item.note}\n`;
        }
      });
      if(isConsolidated && orders.length > 1) { // Add separator for consolidated view
        commands += lineSeparator;
      }
    }
    
    // Footer
    if(!isConsolidated) {
        const orderItemsArray: OrderItem[] = Array.isArray(orders[0].items) ? orders[0].items : JSON.parse(orders[0].items || '[]');
        commands += `[CENTER]Items: ${orderItemsArray.reduce((acc: number, item: OrderItem) => acc + item.quantity, 0)}\n`;
    }
    
    // Cut paper
    commands += '\n\n\n[CUT]';

    // This is a simplified text format. A real implementation would use Buffer and byte commands.
    return commands;
}


async function generateEscPosCommandsForInvoice(
  data: PrintableInvoiceDataWithAdjustments, 
  printerSettings: PrinterSetting
): Promise<string> {
  let commands = '';
  const { order, ...settings } = data; 
  
  const thermalCurrencySymbol = settings.currencySymbol === '₹' ? 'Rs.' : settings.currencySymbol;
  const charsPerLine = getCharsPerLine(printerSettings.paperWidth);
  const lineSeparator = '-'.repeat(charsPerLine) + '\n';
  
  const formatLine = (left: string, right: string): string => {
    const spaces = Math.max(0, charsPerLine - left.length - right.length);
    return `${left}${' '.repeat(spaces)}${right}\n`;
  };
  
  commands += `[INIT]\n`; 
  if (printerSettings.openCashDrawer === 'before_print') { commands += `[OPENCASHDRAWER]\n`; }

  const sectionOrder: InvoiceSectionKey[] = settings.invoiceSectionOrder ? JSON.parse(settings.invoiceSectionOrder) : DEFAULT_INVOICE_SECTION_ORDER;
  const showCalculatedCost = settings.showCalculatedCostOnInvoiceAdmin || false;
  let totalCalculatedCostInBase = 0;
  
  const orderItemsArray: OrderItem[] = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' && order.items.startsWith('[') ? JSON.parse(order.items) : []);
  const dateValue = order.createdAt;
  const dateObject = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
  const formattedDateThermal = isValid(dateObject) ? format(dateObject, "dd/MM/yy HH:mm") : "N/A";
  
  for (const sectionKey of sectionOrder) {
    switch (sectionKey) {
      case 'companyHeader':
        commands += `[CENTER]`;
        if (settings.printElements.showLogo && settings.companyLogoUrl) commands += `(Logo URL: ${settings.companyLogoUrl})\n`;
        if (settings.companyName) commands += `[BIG]${settings.companyName}[/BIG]\n`;
        if (settings.printElements.showCompanyAddress && settings.companyAddress) commands += `${settings.companyAddress.substring(0, charsPerLine)}\n`;
        if (settings.printElements.showCompanyPhone && settings.companyPhone) commands += `Ph: ${settings.companyPhone}\n`;
        commands += `[LEFT]`;
        break;
      case 'invoiceHeader':
        if (settings.printElements.showInvoiceHeaderText && settings.invoiceHeaderText) commands += `[CENTER][BOLD]${settings.invoiceHeaderText}[/BOLD]\n`;
        break;
      case 'orderDetails':
        commands += `\n${lineSeparator}`;
        commands += `[CENTER]Order ID: #${String(order.id).substring(0, 10)}\n`;
        commands += `Date: ${formattedDateThermal}\n`;
        commands += `Customer: ${order.customerName.substring(0, charsPerLine - 10)}\n`;
        if (order.orderType === 'Dine-in' && order.tableNumber) commands += `Table: ${order.tableNumber} (${order.orderType})\n`;
        else commands += `Type: ${order.orderType}\n`;
        if (order.paymentId && order.paymentType !== 'Pending') commands += `Pmt ID: ${order.paymentId.substring(0, charsPerLine - 10)} (${order.paymentType})\n`;
        if (order.paymentType === 'Pending') commands += `[BOLD]PAYMENT PENDING[/BOLD]\n`;
        commands += `${lineSeparator}`;
        commands += `[LEFT]`;
        break;
      case 'itemsTable':
        commands += `[BOLD]${formatLine("Item(s)", "Total")}[/BOLD]`;
        commands += `${formatLine("(Qty x Price)", "")}`;
        commands += `${lineSeparator}`;
        for (const item of orderItemsArray) {
          const itemPriceInDisplay = await convertPriceForPrint(item.price, data.currencyCode);
          const itemTotalInDisplay = itemPriceInDisplay * item.quantity;
          let itemName = item.name; if (item.selectedPortion && item.selectedPortion !== "fixed") { itemName += ` (${item.selectedPortion})`; }
          if (itemName.length > charsPerLine - 12) itemName = itemName.substring(0, charsPerLine - 15) + '...';
          if (showCalculatedCost && item.currentCalculatedCost !== undefined) {
              totalCalculatedCostInBase += item.currentCalculatedCost * item.quantity;
          }
          commands += formatLine(itemName, `${thermalCurrencySymbol}${itemTotalInDisplay.toFixed(2)}`);
          commands += `  ${item.quantity}x ${thermalCurrencySymbol}${itemPriceInDisplay.toFixed(2)}\n`;
          if (item.note) commands += `  Note: ${item.note.substring(0, charsPerLine - 8)}\n`;
        }
        commands += `${lineSeparator}`;
        break;
      case 'totals':
        commands += `[RIGHT]`;
        const subtotalInDisplay = await convertPriceForPrint(order.total, data.currencyCode);
        let discountAmount = 0;
        if (data.discount && data.discount.value > 0) {
            if(data.discount.type === 'percentage') { discountAmount = subtotalInDisplay * (data.discount.value / 100); } 
            else { discountAmount = await convertPriceForPrint(data.discount.value, data.currencyCode); }
        }
        const totalAfterDiscount = Math.max(0, subtotalInDisplay - discountAmount);
        const serviceChargeAmount = totalAfterDiscount * ((settings.serviceChargePercentage || 0) / 100);
        const taxableAmount = totalAfterDiscount + serviceChargeAmount;

        const applicableGstRate = settings.isCompositionScheme ? 5 : (settings.gstPercentage || 0);
        const gstAmount = settings.isCompositionScheme ? (taxableAmount * (applicableGstRate / 100)) : (taxableAmount * (applicableGstRate / 100));
        
        const vatAmount = taxableAmount * ((settings.vatPercentage || 0) / 100);
        const cessAmount = (taxableAmount + gstAmount + vatAmount) * ((settings.cessPercentage || 0) / 100);
        const grandTotalInDisplay = taxableAmount + gstAmount + vatAmount + cessAmount;
        
        commands += `Subtotal: ${thermalCurrencySymbol}${subtotalInDisplay.toFixed(2)}\n`;
        if(serviceChargeAmount > 0) commands += `Service Charge (${settings.serviceChargePercentage}%): ${thermalCurrencySymbol}${serviceChargeAmount.toFixed(2)}\n`;
        if(discountAmount > 0) commands += `[BOLD]Discount: -${thermalCurrencySymbol}${discountAmount.toFixed(2)}[/BOLD]\n`;
        if(gstAmount > 0) commands += `GST (${applicableGstRate}%): ${thermalCurrencySymbol}${gstAmount.toFixed(2)}\n`;
        if(vatAmount > 0) commands += `VAT (${settings.vatPercentage}%): ${thermalCurrencySymbol}${vatAmount.toFixed(2)}\n`;
        if(cessAmount > 0) commands += `Cess (${settings.cessPercentage}%): ${thermalCurrencySymbol}${cessAmount.toFixed(2)}\n`;
        
        commands += `[BIG]GRAND TOTAL: ${thermalCurrencySymbol}${grandTotalInDisplay.toFixed(2)}[/BIG]\n`;
        commands += `[LEFT]\n`;
        break;
      case 'taxInfo':
        if ((settings.printElements.showPanNumber && settings.panNumber) || (settings.printElements.showGstNumber && settings.gstNumber) || (settings.printElements.showFssaiNumber && settings.fssaiNumber)) {
          commands += `${lineSeparator}[CENTER]`;
          if (settings.printElements.showPanNumber && settings.panNumber) commands += `PAN: ${settings.panNumber}\n`;
          if (settings.printElements.showGstNumber && settings.gstNumber) commands += `GSTIN: ${settings.gstNumber}\n`;
          if (settings.printElements.showFssaiNumber && settings.fssaiNumber) commands += `FSSAI: ${settings.fssaiNumber}\n`;
          commands += `[LEFT]\n`;
        }
        break;
      case 'qrCodeOrder':
          if (settings.printElements.showScanForOrderQR && settings.scanForOrderQRUrl) {
            commands += `${lineSeparator}[CENTER]Scan for Menu/Order:\n(QR URL: ${settings.scanForOrderQRUrl})\n`;
          }
        break;
      case 'qrCodePay':
        if (settings.printElements.showScanForPayQR && settings.scanForPayQRUrl) {
           commands += `[CENTER]Scan to Pay:\n(QR URL: ${settings.scanForPayQRUrl})\n[LEFT]`;
        }
        break;
      case 'footerText1':
        const footerText1ToUse = await getFooterText1ForPrint(settings, data.language);
        if (settings.printElements.showInvoiceFooterText1 && footerText1ToUse) { commands += `${lineSeparator}[CENTER]${footerText1ToUse.substring(0, charsPerLine)}\n`; }
        break;
      case 'footerText2':
        if (settings.printElements.showInvoiceFooterText2 && settings.invoiceFooterText2) { commands += `[CENTER]${settings.invoiceFooterText2.substring(0, charsPerLine)}\n`; }
        break;
      case 'closingMessage':
        commands += `${lineSeparator}[CENTER][BOLD]Thank you for your visit![/BOLD]\n[LEFT]`;
        break;
    }
  }
  
  commands += '\n\n\n[CUT]\n'; 
  if (printerSettings.openCashDrawer === 'after_print') { commands += `[OPENCASHDRAWER]\n`; }

  return commands;
}


export async function sendTestPrintCommand({
  printer,
  invoiceData, 
  kotData,
}: {
  printer: PrinterSetting;
  invoiceData?: PrintableInvoiceDataWithAdjustments; 
  kotData?: PrintableKOTData;
}): Promise<TestPrintResult> {
  console.log('[Printer Action] Received print command for:', printer.name);
  
  if (printer.connectionType !== 'network') {
    const message = `Direct backend print test is only available for network printers. For ${printer.connectionType} printers, printing is usually done via system print dialogs.`;
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

  let textData: string;
  let printType: string;

  try {
    if (kotData) {
        printType = kotData.orders ? 'Consolidated KOT' : 'KOT';
        textData = await generateKOTEscPosCommands(kotData, printer);
    } else if (invoiceData) {
        printType = 'Invoice';
        textData = await generateEscPosCommandsForInvoice(invoiceData, printer);
    } else {
        return { success: false, message: 'No data provided for printing (neither invoice nor KOT).' };
    }
  } catch (generationError) {
    console.error(`[Printer Action] Error generating text commands:`, generationError);
    return { success: false, message: 'Failed to generate print data.', details: (generationError as Error).message };
  }
  
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
      // NOTE: This is a placeholder. A real implementation would convert `textData` 
      // with pseudo-tags like [BOLD] into actual ESC/POS byte commands.
      // For now, we send it as plain text.
      client.write(textData.replace(/\[.*?\]/g, ''), 'ascii', (err) => {
        if (err) {
          connectionError = `Failed to send data: ${err.message}`;
          settlePromise({ success: false, message: `Error sending ${printType} to ${printer.name}.`, details: connectionError });
        } else {
          client.end(() => {
            settlePromise({ success: true, message: `${printType} command sent to ${printer.name}.`, details: `Sent ${textData.length} bytes (as plain text). Connection closed.` });
          });
          setTimeout(() => { 
            if (!promiseSettled) settlePromise({ success: true, message: `${printType} command sent to ${printer.name}, but client.end() confirmation timed out.`, details: `Sent ${textData.length} bytes.` });
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
