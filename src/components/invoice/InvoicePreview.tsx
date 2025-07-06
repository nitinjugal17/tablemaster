"use client";

import type { Order, OrderItem, InvoiceSetupSettings, PrintableInvoiceDataWithAdjustments, CurrencyCode, InvoiceSectionKey } from '@/lib/types';
import { BASE_CURRENCY_CODE, DEFAULT_CONVERSION_RATES, DEFAULT_INVOICE_SECTION_ORDER } from '@/lib/types'; 
import NextImage from 'next/image'; 
import { format, parseISO, isValid } from 'date-fns';
import React from 'react';
import { cn } from '@/lib/utils'; 
import { useTranslation } from 'react-i18next';

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

interface InvoicePreviewProps {
  data: PrintableInvoiceDataWithAdjustments; 
  previewType?: 'thermal' | 'pdf' | 'email'; 
  id?: string; 
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, previewType = 'pdf', id }) => {
  const { i18n } = useTranslation();
  const lang = data.language || 'en';
  const labels = invoiceLabels[lang];

  const { order, currencySymbol: displayCurrencySymbol, currencyCode: displayCurrencyCode, ...settings } = data;

  const convertPriceForDisplay = (priceInBase: number): number => {
    if (BASE_CURRENCY_CODE === displayCurrencyCode) {
      return priceInBase;
    }
    const conversionRates = (settings as any).rates || DEFAULT_CONVERSION_RATES; 
    const rate = conversionRates[BASE_CURRENCY_CODE]?.[displayCurrencyCode];
    
    if (rate) {
      return priceInBase * rate;
    }
    console.warn(`[InvoicePreview] Conversion rate from ${BASE_CURRENCY_CODE} to ${displayCurrencyCode} not found. Returning base price.`);
    return priceInBase; 
  };

  const formattedDate = React.useMemo(() => {
    if (!order.createdAt) return "N/A";
    try {
      const date = parseISO(order.createdAt);
      return isValid(date) ? format(date, "MMM d, yyyy, h:mm a") : "Invalid Date";
    } catch (e) { return "Invalid Date"; }
  }, [order.createdAt]);
  
  const formattedDateThermal = React.useMemo(() => {
    if (!order.createdAt) return "N/A";
    try {
      const date = parseISO(order.createdAt);
      return isValid(date) ? format(date, "dd/MM/yy HH:mm") : "Invalid Date";
    } catch (e) { return "Invalid Date"; }
  }, [order.createdAt]);

  const subtotalBeforeDiscountInDisplay = convertPriceForDisplay(order.total);
  let discountAmount = 0;
  if (data.discount && data.discount.value > 0) {
      if(data.discount.type === 'percentage') {
          discountAmount = subtotalBeforeDiscountInDisplay * (data.discount.value / 100);
      } else {
          discountAmount = convertPriceForDisplay(data.discount.value);
      }
  }
  const subtotalInDisplay = Math.max(0, subtotalBeforeDiscountInDisplay - discountAmount);
  
  const gstPercentage = settings.gstPercentage || 0;
  const vatPercentage = settings.vatPercentage || 0;
  const cessPercentage = settings.cessPercentage || 0;

  const gstAmount = subtotalInDisplay * (gstPercentage / 100);
  const vatAmount = subtotalInDisplay * (vatPercentage / 100);
  const taxableForCess = subtotalInDisplay + gstAmount + vatAmount;
  const cessAmount = taxableForCess * (cessPercentage / 100);
  const grandTotalInDisplay = subtotalInDisplay + gstAmount + vatAmount + cessAmount;
  const showCalculatedCost = settings.showCalculatedCostOnInvoiceAdmin || false;
  const showNutritionalInfo = settings.showNutritionalInfoOnInvoice || false;
  let totalCalculatedCostInBase = 0;

  const renderSection = (isVisible: boolean, content: React.ReactNode) => {
    return isVisible ? <>{content}</> : null;
  };
  
  const sectionOrder: InvoiceSectionKey[] = React.useMemo(() => {
    try {
      return settings.invoiceSectionOrder ? JSON.parse(settings.invoiceSectionOrder) : DEFAULT_INVOICE_SECTION_ORDER;
    } catch {
      return DEFAULT_INVOICE_SECTION_ORDER;
    }
  }, [settings.invoiceSectionOrder]);

  // --- Thermal Receipt JSX Definitions ---
  const sectionsMapThermal: Record<InvoiceSectionKey, React.ReactNode | null> = {
    companyHeader: (
      <div className="text-center space-y-px mb-1">
        {renderSection(settings.printElements.showLogo && !!settings.companyLogoUrl, 
          <NextImage src={settings.companyLogoUrl!} alt="Company Logo" width={80} height={40} className="mx-auto object-contain my-1" data-ai-hint="company logo"/>
        )}
        {renderSection(!!settings.companyName, <div className="font-bold text-sm">{settings.companyName}</div>)}
        {renderSection(settings.printElements.showCompanyAddress && !!settings.companyAddress, <div className="text-[0.65rem]">{settings.companyAddress}</div>)}
        {renderSection(settings.printElements.showCompanyPhone && !!settings.companyPhone, <div className="text-[0.65rem]">Ph: {settings.companyPhone}</div>)}
      </div>
    ),
    invoiceHeader: renderSection(settings.printElements.showInvoiceHeaderText && !!settings.invoiceHeaderText, 
      <div className="text-center font-semibold my-1 text-xs">{settings.invoiceHeaderText}</div>
    ),
    orderDetails: (
      <div className="text-[0.65rem] my-1 space-y-px text-center">
        <hr className="border-t border-dashed border-black my-1" />
        <div>{labels.orderId} #{String(order.id).substring(0,10)}</div>
        <div>{labels.date} {formattedDateThermal}</div>
        <div>{labels.customer} {order.customerName.substring(0, 30)}</div>
        {order.orderType === 'Dine-in' && order.tableNumber && <div>{labels.table} {order.tableNumber} ({order.orderType})</div>}
        {order.orderType !== 'Dine-in' && <div>{labels.orderType} {order.orderType}</div>}
        {order.paymentId && order.paymentType !== 'Pending' && <div className="truncate">{labels.paymentId} {order.paymentId} ({order.paymentType})</div>}
        {order.paymentType === 'Pending' && <div className="font-semibold">{labels.paymentStatusPending}</div>}
        <hr className="border-t border-dashed border-black my-1" />
      </div>
    ),
    itemsTable: (
      <div className="my-1">
        <div className={cn("text-[0.65rem] font-bold flex justify-between px-1", showCalculatedCost && "grid grid-cols-[2fr_1fr_1fr] text-left")}>
          <span>{labels.itemsTableHeader} {showCalculatedCost && `(${labels.costTableHeader})`}</span>
          {showCalculatedCost && <span className="text-right">{labels.priceTableHeader}</span>}
          <span className="text-right">{labels.totalTableHeader}</span>
        </div>
         <div className={cn("text-[0.6rem] flex justify-between px-1", showCalculatedCost && "grid grid-cols-[2fr_1fr_1fr] text-left")}>
            <span>({labels.qtyTableHeader} x {labels.priceTableHeader})</span>
            {showCalculatedCost && <span className="text-right"></span>}
            <span className="text-right"></span>
        </div>
        <hr className="border-t border-dashed border-black my-0.5" />
        <div className="space-y-0.5 text-[0.65rem] py-0.5">
          {order.items.map((item: OrderItem, index: number) => {
            const itemPriceInDisplay = convertPriceForDisplay(item.price);
            const itemTotalInDisplay = itemPriceInDisplay * item.quantity;
            
            let itemName = item.name;
            if (item.selectedPortion && item.selectedPortion !== "fixed") {
                itemName += ` (${item.selectedPortion})`;
            }
            let itemNameLine = itemName; 
            if (itemNameLine.length > (showCalculatedCost ? 15 : 20)) itemNameLine = itemNameLine.substring(0, (showCalculatedCost ? 13 : 18)) + "..";
            
            if (showCalculatedCost && item.currentCalculatedCost !== undefined) {
                totalCalculatedCostInBase += item.currentCalculatedCost * item.quantity;
            }

            let nutritionString = '';
            if (showNutritionalInfo) {
              if (item.calories) nutritionString += `Cal:${item.calories} `;
              if (item.carbs) nutritionString += `C:${item.carbs}g `;
              if (item.protein) nutritionString += `P:${item.protein}g `;
              if (item.fat) nutritionString += `F:${item.fat}g`;
              if (item.energyKJ) nutritionString += ` (${item.energyKJ}kJ)`;
              nutritionString = nutritionString.trim();
            }

            return (
              <React.Fragment key={`${item.menuItemId}-${index}-thermal`}>
                <div className={cn("px-1", showCalculatedCost && "grid grid-cols-[2fr_1fr_1fr] items-start")}>
                  <span className="col-span-1">{itemNameLine}{showCalculatedCost && item.currentCalculatedCost !== undefined ? ` (${BASE_CURRENCY_CODE}${item.currentCalculatedCost.toFixed(2)})` : ''}</span>
                  {showCalculatedCost && <span className="text-right">{displayCurrencySymbol}{itemPriceInDisplay.toFixed(2)}</span>}
                  <span className="text-right">{displayCurrencySymbol}{itemTotalInDisplay.toFixed(2)}</span>
                </div>
                 <div className={cn("flex justify-between px-2", showCalculatedCost && "grid grid-cols-[2fr_1fr_1fr] items-start")}>
                    <span>  {item.quantity}x{showCalculatedCost ? '' : `${displayCurrencySymbol}${itemPriceInDisplay.toFixed(2)}`}</span>
                    {showCalculatedCost && <span className="text-right"></span>}
                    <span className="text-right">{showCalculatedCost ? '' : ''}</span>
                </div>
                {item.note && <div className="px-2 text-[0.6rem] italic">  {labels.itemNotePrefix} {item.note.substring(0, 25)}</div>}
                {showNutritionalInfo && nutritionString && <div className="px-2 text-[0.55rem] text-gray-600">  Nutri: {nutritionString} {item.servingSizeSuggestion ? `(${item.servingSizeSuggestion.substring(0,15)})` : ''}</div>}
              </React.Fragment>
            );
          })}
        </div>
        <hr className="border-t border-dashed border-black my-0.5" />
      </div>
    ),
    totals: (
      <div className="my-1 pt-0.5 space-y-px text-[0.65rem] text-right px-1">
        <div>{labels.subtotalLabel} {displayCurrencySymbol}{subtotalBeforeDiscountInDisplay.toFixed(2)}</div>
        {discountAmount > 0 && <div className="font-semibold">{labels.discountLabel} -{displayCurrencySymbol}{discountAmount.toFixed(2)}</div>}
        {gstAmount > 0 && <div>{labels.gstLabel} ({gstPercentage}%): {displayCurrencySymbol}{gstAmount.toFixed(2)}</div>}
        {vatAmount > 0 && <div>{labels.vatLabel} ({vatPercentage}%): {displayCurrencySymbol}{vatAmount.toFixed(2)}</div>}
        {cessAmount > 0 && <div>{labels.cessLabel} ({cessPercentage}%): {displayCurrencySymbol}{cessAmount.toFixed(2)}</div>}
        <div className="font-bold text-xs mt-0.5">{labels.grandTotalLabel} {displayCurrencySymbol}{grandTotalInDisplay.toFixed(2)}</div>
        {showCalculatedCost && totalCalculatedCostInBase > 0 && (
            <div className="text-xs text-muted-foreground">{labels.totalCalculatedCostLabel} {BASE_CURRENCY_CODE} {totalCalculatedCostInBase.toFixed(2)}</div>
        )}
      </div>
    ),
    taxInfo: ((settings.printElements.showPanNumber && settings.panNumber) || (settings.printElements.showGstNumber && settings.gstNumber) || (settings.printElements.showFssaiNumber && settings.fssaiNumber)) ? (
      <div className={`text-center space-y-px text-[0.6rem] border-t border-dashed border-black pt-1 mt-1`}>
          {renderSection(settings.printElements.showPanNumber && !!settings.panNumber, <p>{labels.panLabel} {settings.panNumber}</p>)}
          {renderSection(settings.printElements.showGstNumber && !!settings.gstNumber, <p>{labels.gstinLabel} {settings.gstNumber}</p>)}
          {renderSection(settings.printElements.showFssaiNumber && !!settings.fssaiNumber, <p>{labels.fssaiLabel} {settings.fssaiNumber}</p>)}
      </div>
    ) : null,
    qrCodeOrder: renderSection(settings.printElements.showScanForOrderQR && !!settings.scanForOrderQRUrl,
      <div className="text-center text-[0.6rem] space-y-1 pt-1 mt-1 border-t border-dashed border-black">
        <div className="inline-block mx-1 my-0.5 text-center">
          <NextImage src={settings.scanForOrderQRUrl} alt="Order QR" width={60} height={60} className="mx-auto object-contain" data-ai-hint="qr code menu"/>
          <p className="text-[0.55rem] mt-px">{labels.scanForMenuOrder}</p>
        </div>
      </div>
    ),
    qrCodePay: renderSection(settings.printElements.showScanForPayQR && !!settings.scanForPayQRUrl,
      <div className="text-center text-[0.6rem] space-y-1 pt-1 mt-1 border-t border-dashed border-black">
        <div className="inline-block mx-1 my-0.5 text-center">
          <NextImage src={settings.scanForPayQRUrl} alt="Pay QR" width={60} height={60} className="mx-auto object-contain" data-ai-hint="qr code payment"/>
          <p className="text-[0.55rem] mt-px">{labels.scanToPay}</p>
        </div>
      </div>
    ),
    footerText1: renderSection(settings.printElements.showInvoiceFooterText1 && !!settings.invoiceFooterText1,
      <p className={`text-center text-[0.65rem] italic pt-1 mt-1 border-t border-dashed border-black`}>{settings.invoiceFooterText1}</p>
    ),
    footerText2: renderSection(settings.printElements.showInvoiceFooterText2 && !!settings.invoiceFooterText2,
      <p className={`text-center text-[0.55rem] mt-0.5`}>{settings.invoiceFooterText2?.substring(0, 80)}</p>
    ),
    closingMessage: <p className={`text-center font-semibold text-[0.7rem] pt-1 mt-1`}>{labels.thankYouMessage}</p>,
  };

  // --- PDF/Email Invoice JSX Definitions ---
  const sectionsMapPdfEmail: Record<InvoiceSectionKey, React.ReactNode | null> = {
    companyHeader: (
      <div className="text-center mb-4">
        {renderSection(settings.printElements.showLogo && !!settings.companyLogoUrl,
          <NextImage src={settings.companyLogoUrl} alt="Company Logo" width={120} height={60} className="mx-auto mb-2 object-contain" data-ai-hint="company logo"/>
        )}
        {renderSection(!!settings.companyName, <h1 className="font-headline text-2xl font-bold text-primary">{settings.companyName}</h1>)}
        {renderSection(settings.printElements.showCompanyAddress && !!settings.companyAddress, <p className="text-xs text-muted-foreground">{settings.companyAddress}</p>)}
        {renderSection(settings.printElements.showCompanyPhone && !!settings.companyPhone, <p className="text-xs text-muted-foreground">Ph: {settings.companyPhone}</p>)}
      </div>
    ),
    invoiceHeader: renderSection(settings.printElements.showInvoiceHeaderText && !!settings.invoiceHeaderText, 
      <p className={`text-center font-semibold mb-3 text-md text-accent`}>{settings.invoiceHeaderText}</p>
    ),
    orderDetails: (
      <div className="mb-4 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-3 bg-muted/50 rounded-md">
          <div><strong>{labels.orderId}</strong></div><div>#{String(order.id).substring(0,8)}...</div>
          <div><strong>{labels.date}</strong></div><div>{formattedDate}</div>
          <div><strong>{labels.customer}</strong></div><div>{order.customerName}</div>
          {order.orderType === 'Dine-in' && order.tableNumber && 
            <><div><strong>{labels.table}</strong></div><div>{order.tableNumber}</div></>
          }
          <div><strong>{labels.orderType}</strong></div><div>{order.orderType}</div>
          {order.paymentId && order.paymentType !== 'Pending' && 
            <><div><strong>${labels.paymentId}</strong></div><div className="truncate">{order.paymentId} (${order.paymentType})</div></>
          }
          {order.paymentType === 'Pending' && 
            <><div><strong>Payment:</strong></div><div className="font-semibold text-destructive">${labels.paymentStatusPending}</div></>
          }
        </div>
      </div>
    ),
    itemsTable: (
      <div className="mb-4">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/70">
            <tr>
              <th className="text-left font-semibold p-2 border-b">{labels.itemsTableHeader}</th>
              <th className="text-center font-semibold p-2 border-b">{labels.qtyTableHeader}</th>
              <th className="text-right font-semibold p-2 border-b">{labels.priceTableHeader}</th>
              {showCalculatedCost && <th className="text-right font-semibold p-2 border-b cost-column-header">{labels.costTableHeader} ({BASE_CURRENCY_CODE})</th>}
              <th className="text-right font-semibold p-2 border-b">${labels.totalTableHeader}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: OrderItem, index: number) => {
              const itemPriceInDisplay = convertPriceForDisplay(item.price);
              const itemTotalInDisplay = itemPriceInDisplay * item.quantity;
              if (showCalculatedCost && item.currentCalculatedCost !== undefined) {
                totalCalculatedCostInBase += item.currentCalculatedCost * item.quantity;
              }
              let nutritionString = '';
              if (showNutritionalInfo) {
                if (item.calories) nutritionString += `Cals: ${item.calories}kcal, `;
                if (item.carbs) nutritionString += `Carbs: ${item.carbs}g, `;
                if (item.protein) nutritionString += `Protein: ${item.protein}g, `;
                if (item.fat) nutritionString += `Fat: ${item.fat}g`;
                if (item.energyKJ) nutritionString += ` (${item.energyKJ}kJ)`;
                nutritionString = nutritionString.trim().replace(/,$/, '');
              }
              const itemDisplayName = item.selectedPortion && item.selectedPortion !== "fixed" 
                                      ? `${item.name} (${item.selectedPortion})` 
                                      : item.name;

              return (
                <tr key={`${item.menuItemId}-${index}-pdf`} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="p-2">
                    {itemDisplayName}
                    {item.note && <div className="text-[0.75rem] text-muted-foreground italic pl-1">${labels.itemNotePrefix} {item.note}</div>}
                    {showNutritionalInfo && nutritionString && <div className="nutritional-info">{nutritionString} {item.servingSizeSuggestion ? `(${item.servingSizeSuggestion})` : ''}</div>}
                  </td>
                  <td className="text-center p-2">{item.quantity}</td>
                  <td className="text-right p-2">{displayCurrencySymbol}{itemPriceInDisplay.toFixed(2)}</td>
                  {showCalculatedCost && <td className="text-right p-2 cost-column-cell">{item.currentCalculatedCost !== undefined ? `${BASE_CURRENCY_CODE} ${(item.currentCalculatedCost * item.quantity).toFixed(2)}` : 'N/A'}</td>}
                  <td className="text-right p-2">{displayCurrencySymbol}{itemTotalInDisplay.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ),
    totals: (
      <div className="mb-4 text-sm flex justify-end">
        <div className="w-full max-w-xs space-y-1">
          <div className="flex justify-between"><span>${labels.subtotalLabel}</span><span>{displayCurrencySymbol}{subtotalBeforeDiscountInDisplay.toFixed(2)}</span></div>
          {discountAmount > 0 && <div className="flex justify-between text-green-600"><span>${labels.discountLabel}</span><span>-${displayCurrencySymbol}{discountAmount.toFixed(2)}</span></div>}
          {gstAmount > 0 && (<div className="flex justify-between"><span>${labels.gstLabel} (${gstPercentage}%):</span><span>{displayCurrencySymbol}{gstAmount.toFixed(2)}</span></div>)}
          {vatAmount > 0 && (<div className="flex justify-between"><span>${labels.vatLabel} (${vatPercentage}%):</span><span>{displayCurrencySymbol}{vatAmount.toFixed(2)}</span></div>)}
          {cessAmount > 0 && (<div className="flex justify-between"><span>${labels.cessLabel} (${cessPercentage}%):</span><span>{displayCurrencySymbol}{cessAmount.toFixed(2)}</span></div>)}
          <hr className="my-1 border-muted-foreground/50"/>
          <div className={`flex justify-between font-bold mt-1 ${previewType === 'email' ? 'text-lg' : 'text-xl'}`}><span>${labels.grandTotalLabel}</span><span>{displayCurrencySymbol}{grandTotalInDisplay.toFixed(2)}</span></div>
           {showCalculatedCost && totalCalculatedCostInBase > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
              <span>${labels.totalCalculatedCostLabel}</span>
              <span>{BASE_CURRENCY_CODE} ${totalCalculatedCostInBase.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    ),
    taxInfo: ((settings.printElements.showPanNumber && settings.panNumber) || (settings.printElements.showGstNumber && settings.gstNumber) || (settings.printElements.showFssaiNumber && settings.fssaiNumber)) ? (
      <div className="text-center space-y-0.5 text-xs text-muted-foreground pt-3 mt-3 border-t">
          {renderSection(settings.printElements.showPanNumber && !!settings.panNumber, <p>{labels.panLabel} ${settings.panNumber}</p>)}
          {renderSection(settings.printElements.showGstNumber && !!settings.gstNumber, <p>{labels.gstinLabel} ${settings.gstNumber}</p>)}
          {renderSection(settings.printElements.showFssaiNumber && !!settings.fssaiNumber, <p>{labels.fssaiLabel} ${settings.fssaiNumber}</p>)}
      </div>
    ) : null,
    qrCodeOrder: renderSection(settings.printElements.showScanForOrderQR && !!settings.scanForOrderQRUrl,
      <div className="flex justify-center items-center mt-4 pt-4 border-t">
        <div className="text-center">
          <NextImage src={settings.scanForOrderQRUrl} alt="Order QR" width={70} height={70} className="mx-auto object-contain" data-ai-hint="qr code menu"/>
          <p className="text-xs mt-1 text-muted-foreground">${labels.scanForMenuOrder}</p>
        </div>
      </div>
    ),
    qrCodePay: renderSection(settings.printElements.showScanForPayQR && !!settings.scanForPayQRUrl,
      <div className="flex justify-center items-center mt-4 pt-4 border-t">
        <div className="text-center">
          <NextImage src={settings.scanForPayQRUrl} alt="Pay QR" width={70} height={70} className="mx-auto object-contain" data-ai-hint="qr code payment"/>
          <p className="text-xs mt-1 text-muted-foreground">${labels.scanToPay}</p>
        </div>
      </div>
    ),
    footerText1: renderSection(settings.printElements.showInvoiceFooterText1 && !!settings.invoiceFooterText1,
      <p className="text-center mt-4 pt-4 border-t text-sm italic text-muted-foreground">{settings.invoiceFooterText1}</p>
    ),
    footerText2: renderSection(settings.printElements.showInvoiceFooterText2 && !!settings.invoiceFooterText2,
      <p className="text-center mt-2 text-xs text-muted-foreground">{settings.invoiceFooterText2}</p>
    ),
    closingMessage: <p className="text-center mt-4 pt-2 border-t text-md font-semibold">${labels.thankYouMessage}</p>,
  };

  const currentId = id || (previewType === 'thermal' ? "invoice-preview-thermal-dynamic" : "invoice-preview-pdf-dynamic");

  if (previewType === 'thermal') {
    return (
      <div id={currentId} className={cn(
        "invoice-preview-thermal bg-white text-black p-1 font-mono text-[0.7rem] leading-tight max-w-[320px] mx-auto space-y-0.5",
        "print:w-full print:max-w-none print:text-[10pt]" 
      )}>
        {sectionOrder.map((sectionKey) => (
          <React.Fragment key={`${sectionKey}-thermal-preview`}>
            {sectionsMapThermal[sectionKey]}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div id={currentId} className={cn(
        `invoice-preview bg-background text-foreground p-4 sm:p-6 shadow-lg rounded-md font-sans text-base`,
        previewType === 'email' ? 'border border-border max-w-xl mx-auto text-sm' : 'max-w-2xl mx-auto text-base',
        "print:shadow-none print:border-none print:max-w-none print:text-black print:bg-white" 
    )}>
      {sectionOrder.map((sectionKey) => (
         <React.Fragment key={`${sectionKey}-pdf-email-preview`}>
           {sectionsMapPdfEmail[sectionKey]}
         </React.Fragment>
      ))}
    </div>
  );
};

export default InvoicePreview;
