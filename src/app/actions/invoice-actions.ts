'use server';

import { sendEmail } from '@/lib/emailService';
import type { Order, InvoiceSetupSettings, CurrencyCode, InvoiceSectionKey, PrintableInvoiceDataWithAdjustments } from '@/lib/types';
import { BASE_CURRENCY_CODE, DEFAULT_INVOICE_SECTION_ORDER } from '@/lib/types';
import { getConversionRates, getGeneralSettings } from './data-management-actions';
import { format, parseISO } from 'date-fns';
import { generateInvoiceQuote } from '@/ai/flows/generate-invoice-quote';

const invoiceLabels = {
  en: {
    invoiceTitle: "Invoice", orderId: "Order ID:", date: "Date:", customer: "Customer:", table: "Table:",
    orderType: "Order Type:", paymentId: "Payment ID:", paymentStatusPending: "PAYMENT PENDING",
    itemsTableHeader: "Item(s)", qtyTableHeader: "Qty", priceTableHeader: "Price",
    costTableHeader: "Cost", totalTableHeader: "Total", itemNotePrefix: "Note:",
    subtotalLabel: "Subtotal:", discountLabel: "Discount:", gstLabel: "GST", vatLabel: "VAT", cessLabel: "Cess",
    grandTotalLabel: "TOTAL:", totalCalculatedCostLabel: "Total Calculated Cost:",
    panLabel: "PAN:", gstinLabel: "GSTIN:", fssaiLabel: "FSSAI:",
    scanForMenuOrder: "Scan for Menu/Order", scanToPay: "Scan to Pay",
    thankYouMessage: "Thank you for your business!",
    nutritionalInfoTitle: "Nutritional Information (Estimates):"
  },
  hi: {
    invoiceTitle: "बीजक", orderId: "ऑर्डर आईडी:", date: "दिनांक:", customer: "ग्राहक:", table: "टेबल:",
    orderType: "ऑर्डर प्रकार:", paymentId: "भुगतान आईडी:", paymentStatusPending: "भुगतान लंबित है",
    itemsTableHeader: "वस्तु(एँ)", qtyTableHeader: "मात्रा", priceTableHeader: "मूल्य",
    costTableHeader: "लागत", totalTableHeader: "कुल", itemNotePrefix: "नोट:",
    subtotalLabel: "उप-कुल:", discountLabel: "छूट:", gstLabel: "जीएसटी", vatLabel: "वैट", cessLabel: "उपकर",
    grandTotalLabel: "कुल योग:", totalCalculatedCostLabel: "कुल गणना की गई लागत:",
    panLabel: "पैन:", gstinLabel: "जीएसटीआईएन:", fssaiLabel: "एफएसएसएआई:",
    scanForMenuOrder: "मेनू/ऑर्डर के लिए स्कैन करें", scanToPay: "भुगतान के लिए स्कैन करें",
    thankYouMessage: "आपके व्यवसाय के लिए धन्यवाद!",
    nutritionalInfoTitle: "पोषण संबंधी जानकारी (अनुमानित):"
  },
  bn: {
    invoiceTitle: "চালান", orderId: "অর্ডার আইডি:", date: "তারিখ:", customer: "গ্রাহক:", table: "টেবিল:",
    orderType: "অর্ডারের প্রকার:", paymentId: "পেমেন্ট আইডি:", paymentStatusPending: "পেমেন্ট বাকি আছে",
    itemsTableHeader: "আইটেম(গুলি)", qtyTableHeader: "পরিমাণ", priceTableHeader: "মূল্য",
    costTableHeader: "খরচ", totalTableHeader: "মোট", itemNotePrefix: "নোট:",
    subtotalLabel: "উপমোট:", discountLabel: "ছাড়:", gstLabel: "জিএসটি", vatLabel: "ভ্যাট", cessLabel: "সেস",
    grandTotalLabel: "সর্বমোট:", totalCalculatedCostLabel: "মোট গণনাকৃত খরচ:",
    panLabel: "প্যান:", gstinLabel: "জিএসটিআইএন:", fssaiLabel: "এফএসএসএআই:",
    scanForMenuOrder: "মেনু/অর্ডারের জন্য স্ক্যান করুন", scanToPay: "পেমেন্টের জন্য স্ক্যান করুন",
    thankYouMessage: "আপনার ব্যবসার জন্য ধন্যবাদ!",
    nutritionalInfoTitle: "পুষ্টি সম্পর্কিত তথ্য (আনুমানিক):"
  }
};


async function convertPriceForEmail(priceInBase: number, displayCurrencyCode: CurrencyCode, displayCurrencySymbol: string): Promise<string> {
  if (BASE_CURRENCY_CODE === displayCurrencyCode) {
    return `${displayCurrencySymbol}${priceInBase.toFixed(2)}`;
  }
  const conversionRates = await getConversionRates();
  const rate = conversionRates[BASE_CURRENCY_CODE]?.[displayCurrencyCode];
  
  if (rate) {
    return `${displayCurrencySymbol}${(priceInBase * rate).toFixed(2)}`;
  }
  console.warn(`[Invoice Action] Conversion rate from ${BASE_CURRENCY_CODE} to ${displayCurrencyCode} not found for email. Returning base price with base symbol.`);
  const baseSymbol = displayCurrencyCode === BASE_CURRENCY_CODE ? displayCurrencySymbol : (await getConversionRates())[BASE_CURRENCY_CODE]?.[BASE_CURRENCY_CODE] === 1 ? displayCurrencySymbol : 'ERR';
  return `${baseSymbol}${priceInBase.toFixed(2)}`;
};

async function getFooterText1(invoiceSetup: InvoiceSetupSettings, language?: 'en' | 'hi' | 'bn'): Promise<string | undefined> {
  if (invoiceSetup.autoGenerateInvoiceFooterQuote) {
    try {
      const aiQuoteResult = await generateInvoiceQuote({
        language: language || invoiceSetup.invoiceFooterQuoteLanguage || 'en',
        restaurantName: invoiceSetup.companyName,
      });
      return aiQuoteResult.quote;
    } catch (aiError) {
      console.error("AI Quote generation failed for invoice email:", aiError);
      return invoiceSetup.invoiceFooterText1; // Fallback to manual text
    }
  }
  return invoiceSetup.invoiceFooterText1;
}


function generateInvoiceHtml(
    order: Order, 
    invoiceSetup: InvoiceSetupSettings, 
    itemsHtml: string, 
    subtotalFormatted: string,
    discountAmountFormatted: string | null,
    gstAmountFormatted: string,
    vatAmountFormatted: string,
    cessAmountFormatted: string,
    totalFormatted: string,
    footerText1ToUse: string | undefined,
    totalCalculatedCostFormatted?: string,
    nutritionalInfoHtml?: string,
    language?: 'en' | 'hi' | 'bn'
): string {
  const lang = language || 'en';
  const labels = invoiceLabels[lang];

  const formattedDate = order.createdAt ? format(parseISO(order.createdAt), "MMM d, yyyy, h:mm a") : 'N/A';
  const sectionOrder: InvoiceSectionKey[] = invoiceSetup.invoiceSectionOrder ? JSON.parse(invoiceSetup.invoiceSectionOrder) : DEFAULT_INVOICE_SECTION_ORDER;
  
  const styles = `
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
      .container { max-width: 600px; margin: 20px auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
      .company-header { text-align: center; }
      .company-header img.logo { max-width: 150px; max-height: 70px; display: block; margin: 0 auto 15px auto; }
      .company-header h1 { color: hsl(var(--primary-hsl, 7 57% 43%)); text-align: center; font-family: 'Playfair Display', serif; font-size: 24px; margin-bottom: 5px; }
      .company-header p { text-align: center; font-size: 12px; color: hsl(var(--muted-foreground-hsl, 0 0% 45.1%)); margin: 2px 0; }
      .invoice-header { text-align: center; font-weight: bold; margin-bottom: 15px; font-size: 16px; color: hsl(var(--accent-hsl, 130 20% 42%)); }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; margin-bottom: 20px; font-size: 14px; padding:10px; background-color: hsl(var(--muted-hsl, 0 0% 96.1%)/0.5); border-radius: 4px;}
      .details-grid strong { color: hsl(var(--foreground-hsl, 0 0% 3.9%)); }
      .items table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .items th, .items td { border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; }
      .items th { background-color: hsl(var(--muted-hsl, 0 0% 96.1%)/0.7); color: hsl(var(--foreground-hsl, 0 0% 3.9%)); font-weight: 600;}
      .totals-section { text-align: right; font-size: 14px; margin-top: 20px; padding-top:10px; border-top:1px solid #eee; }
      .totals-section p { margin: 4px 0; }
      .totals-section .discount { color: #228B22; }
      .totals-section .grand-total { font-size: 1.2em; font-weight: bold; color: hsl(var(--primary-hsl, 7 57% 43%)); margin-top: 8px;}
      .footer { text-align: center; font-size: 0.9em; color: #777; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; }
      .qr-section { text-align: center; margin-top: 20px; padding-top:15px; border-top: 1px solid #eee;}
      .qr-code { display: inline-block; margin: 0 10px; }
      .qr-code img { max-width: 80px; max-height: 80px; }
      .tax-info { text-align:center; font-size:0.9em; margin-top:20px; border-top: 1px solid #eee; padding-top:10px; color: #555; }
      .footer-text { text-align:center; margin-top: 10px; }
      .footer-text.main { font-style:italic; font-size:1em; margin-top:15px; padding-top:10px; border-top: 1px solid #eee; }
      .footer-text.secondary { font-size:0.8em; color: #666; }
      .cost-column-header { display: ${invoiceSetup.showCalculatedCostOnInvoiceAdmin ? 'table-cell' : 'none'}; }
      .cost-column-cell { display: ${invoiceSetup.showCalculatedCostOnInvoiceAdmin ? 'table-cell' : 'none'}; text-align: right; }
      .nutritional-info { font-size: 0.8em; color: #555; margin-top: 2px; }
      .item-name-portion { font-size: 0.9em; color: #444; font-style: italic; }
    </style>
  `;

  let htmlBody = `<html><head>${styles}</head><body><div class="container">`;

  for (const sectionKey of sectionOrder) {
    switch (sectionKey) {
      case 'companyHeader':
        htmlBody += `<div class="company-header">`;
        if (invoiceSetup.printElements.showLogo && invoiceSetup.companyLogoUrl) htmlBody += `<div><img src="${invoiceSetup.companyLogoUrl}" alt="Company Logo" class="logo" /></div>`;
        if (invoiceSetup.companyName) htmlBody += `<h1>${invoiceSetup.companyName}</h1>`;
        if (invoiceSetup.printElements.showCompanyAddress && invoiceSetup.companyAddress) htmlBody += `<p>${invoiceSetup.companyAddress}</p>`;
        if (invoiceSetup.printElements.showCompanyPhone && invoiceSetup.companyPhone) htmlBody += `<p>Ph: ${invoiceSetup.companyPhone}</p>`;
        htmlBody += `</div>`;
        break;
      case 'invoiceHeader':
        if (invoiceSetup.printElements.showInvoiceHeaderText && invoiceSetup.invoiceHeaderText) htmlBody += `<div class="invoice-header">${invoiceSetup.invoiceHeaderText}</div>`;
        break;
      case 'orderDetails':
        htmlBody += `<div class="details-grid">
          <div><strong>${labels.orderId}</strong></div><div>#${String(order.id).substring(0,8)}...</div>
          <div><strong>${labels.date}</strong></div><div>${formattedDate}</div>
          <div><strong>${labels.customer}</strong></div><div>${order.customerName}</div>
          ${order.orderType === 'Dine-in' && order.tableNumber ? `<div><strong>${labels.table}</strong></div><div>${order.tableNumber}</div>` : ''}
          <div><strong>${labels.orderType}</strong></div><div>${order.orderType}</div>
          ${order.paymentId && order.paymentType !== 'Pending' ? `<div><strong>${labels.paymentId}</strong></div><div style="word-break:break-all;">${order.paymentId} (${order.paymentType})</div>`: ''}
          ${order.paymentType === 'Pending' ? `<div><strong>Payment:</strong></div><div style="font-weight:bold; color: #D32F2F;">${labels.paymentStatusPending}</div>`: ''}
        </div>`;
        break;
      case 'itemsTable':
        htmlBody += `<div class="items">
          <table>
            <thead><tr><th>${labels.itemsTableHeader}</th><th>${labels.qtyTableHeader}</th><th class="text-right">${labels.priceTableHeader}</th><th class="text-right cost-column-header">${labels.costTableHeader} (${BASE_CURRENCY_CODE})</th><th class="text-right">${labels.totalTableHeader}</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>`;
        if (invoiceSetup.showNutritionalInfoOnInvoice && nutritionalInfoHtml && nutritionalInfoHtml.trim() !== "") {
          htmlBody += `<div class="nutritional-info-section mt-4 text-xs text-muted-foreground"><h4 class="font-semibold text-sm mb-1">${labels.nutritionalInfoTitle}</h4>${nutritionalInfoHtml}</div>`;
        }
        break;
      case 'totals':
        htmlBody += `<div class="totals-section">
          <p>${labels.subtotalLabel} <span class="text-right">${subtotalFormatted}</span></p>
          ${discountAmountFormatted ? `<p class="discount">${labels.discountLabel} <span class="text-right">-${discountAmountFormatted}</span></p>` : ''}
          ${(invoiceSetup.gstPercentage || 0) > 0 ? `<p>${labels.gstLabel} (${invoiceSetup.gstPercentage}%): <span class="text-right">${gstAmountFormatted}</span></p>` : ''}
          ${(invoiceSetup.vatPercentage || 0) > 0 ? `<p>${labels.vatLabel} (${invoiceSetup.vatPercentage}%): <span class="text-right">${vatAmountFormatted}</span></p>` : ''}
          ${(invoiceSetup.cessPercentage || 0) > 0 ? `<p>${labels.cessLabel} (${invoiceSetup.cessPercentage}%): <span class="text-right">${cessAmountFormatted}</span></p>` : ''}
          <p class="grand-total">${labels.grandTotalLabel} <span class="text-right">${totalFormatted}</span></p>
          ${invoiceSetup.showCalculatedCostOnInvoiceAdmin && totalCalculatedCostFormatted ? `<p class="text-sm text-muted-foreground">${labels.totalCalculatedCostLabel} ${totalCalculatedCostFormatted}</p>` : ''}
        </div>`;
        break;
      case 'taxInfo':
        if ((invoiceSetup.printElements.showPanNumber && invoiceSetup.panNumber) || (invoiceSetup.printElements.showGstNumber && invoiceSetup.gstNumber) || (invoiceSetup.printElements.showFssaiNumber && invoiceSetup.fssaiNumber)) {
          htmlBody += `<div class="tax-info">
            ${invoiceSetup.printElements.showPanNumber && invoiceSetup.panNumber ? `<p>${labels.panLabel} ${invoiceSetup.panNumber}</p>` : ''}
            ${invoiceSetup.printElements.showGstNumber && invoiceSetup.gstNumber ? `<p>${labels.gstinLabel} ${invoiceSetup.gstNumber}</p>` : ''}
            ${invoiceSetup.printElements.showFssaiNumber && invoiceSetup.fssaiNumber ? `<p>${labels.fssaiLabel} ${invoiceSetup.fssaiNumber}</p>` : ''}
          </div>`;
        }
        break;
      case 'qrCodeOrder':
        if (invoiceSetup.printElements.showScanForOrderQR && invoiceSetup.scanForOrderQRUrl) {
          htmlBody += `<div class="qr-section">
            <div class="qr-code"><img src="${invoiceSetup.scanForOrderQRUrl}" alt="Order QR" /><p style="font-size:0.8em;">${labels.scanForMenuOrder}</p></div>
          </div>`;
        }
        break;
      case 'qrCodePay':
        if (invoiceSetup.printElements.showScanForPayQR && invoiceSetup.scanForPayQRUrl) {
          htmlBody += `<div class="qr-section">
            <div class="qr-code"><img src="${invoiceSetup.scanForPayQRUrl}" alt="Pay QR" /><p style="font-size:0.8em;">${labels.scanToPay}</p></div>
          </div>`;
        }
        break;
      case 'footerText1':
        if (invoiceSetup.printElements.showInvoiceFooterText1 && footerText1ToUse) htmlBody += `<p class="footer-text main">${footerText1ToUse}</p>`;
        break;
      case 'footerText2':
        if (invoiceSetup.printElements.showInvoiceFooterText2 && invoiceSetup.invoiceFooterText2) htmlBody += `<p class="footer-text secondary">${invoiceSetup.invoiceFooterText2}</p>`;
        break;
      case 'closingMessage':
        htmlBody += `<div class="footer">
          <p>${labels.thankYouMessage}</p>
          ${invoiceSetup.printElements.showCompanyAddress && invoiceSetup.companyAddress ? `<p>${invoiceSetup.companyAddress}</p>` : ''}
          ${invoiceSetup.printElements.showCompanyPhone && invoiceSetup.companyPhone ? `<p>Ph: ${invoiceSetup.companyPhone}</p>` : ''}
        </div>`;
        break;
    }
  }
  htmlBody += `</div></body></html>`;
  return htmlBody;
}

export async function sendInvoiceEmail({
  invoiceData,
}: {
  invoiceData: PrintableInvoiceDataWithAdjustments & { customerEmail: string };
}): Promise<{ success: boolean; message: string; messageId?: string }> {
  
  const { order, customerEmail, ...invoiceSetup } = invoiceData;
  
  if (!customerEmail) {
    return { success: false, message: "Order does not have a customer email address." };
  }

  let itemsHtml = '';
  let nutritionalInfoHtml = '';
  let subtotalInBase = 0;
  let totalCalculatedCostInBase = 0;
  let showCalculatedCost = invoiceSetup.showCalculatedCostOnInvoiceAdmin || false;
  let showNutritionalInfo = invoiceSetup.showNutritionalInfoOnInvoice || false;

  for (const item of order.items) {
    const itemPriceFormatted = await convertPriceForEmail(item.price, invoiceSetup.currencyCode, invoiceSetup.currencySymbol);
    const itemTotalInBase = item.price * item.quantity;
    subtotalInBase += itemTotalInBase;
    const itemTotalFormatted = await convertPriceForEmail(itemTotalInBase, invoiceSetup.currencyCode, invoiceSetup.currencySymbol);
    
    let costColumnHtml = '';
    if (showCalculatedCost && item.currentCalculatedCost !== undefined) {
      const itemCalculatedCostFormatted = `${BASE_CURRENCY_CODE} ${(item.currentCalculatedCost * item.quantity).toFixed(2)}`;
      costColumnHtml = `<td class="cost-column-cell">${itemCalculatedCostFormatted}</td>`;
      totalCalculatedCostInBase += item.currentCalculatedCost * item.quantity;
    } else {
      costColumnHtml = `<td class="cost-column-cell"></td>`; 
    }

    const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                            ? `${item.name} <span class="item-name-portion">(${item.selectedPortion})</span>`
                            : item.name;

    itemsHtml += `<tr><td>${itemDisplayName}${item.note ? ` <br/><em style="font-size:0.9em; color:#555;">(${item.note})</em>` : ''}</td><td style="text-align:center;">${item.quantity}</td><td class="text-right">${itemPriceFormatted}</td>${costColumnHtml}<td class="text-right">${itemTotalFormatted}</td></tr>`;
  
    if (showNutritionalInfo) {
      let nutritionForItem = '';
      if (item.calories) nutritionForItem += `Cals: ${item.calories}kcal, `;
      if (item.carbs) nutritionForItem += `Carbs: ${item.carbs}g, `;
      if (item.protein) nutritionForItem += `Protein: ${item.protein}g, `;
      if (item.fat) nutritionForItem += `Fat: ${item.fat}g`;
      if (item.energyKJ) nutritionForItem += ` (${item.energyKJ}kJ)`;
      nutritionForItem = nutritionForItem.trim().replace(/,$/, ''); 

      if (nutritionForItem) {
        nutritionalInfoHtml += `<p><strong>${itemDisplayName}:</strong> ${nutritionForItem} ${item.servingSizeSuggestion ? `(${item.servingSizeSuggestion})` : ''}</p>`;
      }
    }
  }
  
  const subtotalBeforeDiscountInDisplay = await convertPriceForEmail(order.total, invoiceSetup.currencyCode, invoiceSetup.currencySymbol).then(s => parseFloat(s.replace(invoiceSetup.currencySymbol, '')));
  let discountAmount = 0;
  if (invoiceData.discount && invoiceData.discount.value > 0) {
      if(invoiceData.discount.type === 'percentage') {
          discountAmount = subtotalBeforeDiscountInDisplay * (invoiceData.discount.value / 100);
      } else {
          discountAmount = await convertPriceForEmail(invoiceData.discount.value, invoiceSetup.currencyCode, invoiceSetup.currencySymbol).then(s => parseFloat(s.replace(invoiceSetup.currencySymbol, '')));
      }
  }
  const subtotalAfterDiscountInDisplay = Math.max(0, subtotalBeforeDiscountInDisplay - discountAmount);
  
  const discountAmountFormattedString = discountAmount > 0 ? `${invoiceSetup.currencySymbol}${discountAmount.toFixed(2)}` : null;

  const gstPercentage = invoiceSetup.gstPercentage || 0;
  const vatPercentage = invoiceSetup.vatPercentage || 0;
  const cessPercentage = invoiceSetup.cessPercentage || 0;

  const gstAmount = subtotalAfterDiscountInDisplay * (gstPercentage / 100);
  const vatAmount = subtotalAfterDiscountInDisplay * (vatPercentage / 100);
  const taxableForCess = subtotalAfterDiscountInDisplay + gstAmount + vatAmount;
  const cessAmount = taxableForCess * (cessPercentage / 100);
  const grandTotalInDisplay = subtotalAfterDiscountInDisplay + gstAmount + vatAmount + cessAmount;

  const subtotalFormattedString = `${invoiceSetup.currencySymbol}${subtotalAfterDiscountInDisplay.toFixed(2)}`;
  const gstAmountFormattedString = `${invoiceSetup.currencySymbol}${gstAmount.toFixed(2)}`;
  const vatAmountFormattedString = `${invoiceSetup.currencySymbol}${vatAmount.toFixed(2)}`;
  const cessAmountFormattedString = `${invoiceSetup.currencySymbol}${cessAmount.toFixed(2)}`;
  const totalFormattedString = `${invoiceSetup.currencySymbol}${grandTotalInDisplay.toFixed(2)}`;
  const totalCalculatedCostFormattedString = showCalculatedCost ? `${BASE_CURRENCY_CODE} ${totalCalculatedCostInBase.toFixed(2)}` : undefined;


  const footerText1ToUse = await getFooterText1(invoiceSetup, invoiceData.language);

  const htmlContent = generateInvoiceHtml(
    order, 
    invoiceSetup, 
    itemsHtml, 
    subtotalFormattedString,
    discountAmountFormattedString,
    gstAmountFormattedString,
    vatAmountFormattedString,
    cessAmountFormattedString,
    totalFormattedString,
    footerText1ToUse,
    totalCalculatedCostFormattedString,
    nutritionalInfoHtml,
    invoiceData.language
  );
  const subject = `Your Invoice for Order #${String(order.id).substring(0,8)} from ${invoiceSetup.companyName}`;

  return sendEmail({
    to: customerEmail,
    subject,
    html: htmlContent,
  });
}
