
"use client";

import type { Order, OrderItem, InvoiceSetupSettings, PrintableInvoiceDataWithAdjustments, CurrencyCode, InvoiceSectionKey } from '@/lib/types';
import { BASE_CURRENCY_CODE, DEFAULT_INVOICE_SECTION_ORDER } from '@/lib/types'; 
import NextImage from 'next/image'; 
import { format, parseISO, isValid } from 'date-fns';
import React from 'react';
import { cn } from '@/lib/utils'; 
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';

interface InvoicePreviewProps {
  data: PrintableInvoiceDataWithAdjustments; 
  previewType?: 'thermal' | 'pdf' | 'email'; 
  id?: string; 
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, previewType = 'pdf', id }) => {
  const { convertPrice } = useCurrency();
  const lang = data.language || 'en';
  const { t } = useTranslation(['invoice']); // Use the translation hook

  // Function to get labels from i18next
  const getLabels = (lng: 'en' | 'hi' | 'bn') => ({
    invoiceTitle: t('invoice:invoiceTitle', { lng }),
    billOfSupplyTitle: t('invoice:billOfSupplyTitle', { lng }),
    orderId: t('invoice:orderId', { lng }),
    date: t('invoice:date', { lng }),
    customer: t('invoice:customer', { lng }),
    table: t('invoice:table', { lng }),
    phone: t('invoice:phone', { lng }),
    orderType: t('invoice:orderType', { lng }),
    paymentId: t('invoice:paymentId', { lng }),
    paymentStatusPending: t('invoice:paymentStatusPending', { lng }),
    itemsTableHeader: t('invoice:itemsTableHeader', { lng }),
    qtyTableHeader: t('invoice:qtyTableHeader', { lng }),
    priceTableHeader: t('invoice:priceTableHeader', { lng }),
    costTableHeader: t('invoice:costTableHeader', { lng }),
    totalTableHeader: t('invoice:totalTableHeader', { lng }),
    itemNotePrefix: t('invoice:itemNotePrefix', { lng }),
    subtotalLabel: t('invoice:subtotalLabel', { lng }),
    serviceChargeLabel: t('invoice:serviceChargeLabel', {lng}),
    discountLabel: t('invoice:discountLabel', { lng }),
    gstLabel: t('invoice:gstLabel', { lng }),
    vatLabel: t('invoice:vatLabel', { lng }),
    cessLabel: t('invoice:cessLabel', { lng }),
    grandTotalLabel: t('invoice:grandTotalLabel', { lng }),
    totalCalculatedCostLabel: t('invoice:totalCalculatedCostLabel', { lng }),
    panLabel: t('invoice:panLabel', { lng }),
    gstinLabel: t('invoice:gstinLabel', { lng }),
    fssaiLabel: t('invoice:fssaiLabel', { lng }),
    scanForMenuOrder: t('invoice:scanForMenuOrder', { lng }),
    scanToPay: t('invoice:scanToPay', { lng }),
    thankYouMessage: t('invoice:thankYouMessage', { lng }),
    nutritionalInfoTitle: t('invoice:nutritionalInfoTitle', { lng }),
  });

  const labels = getLabels(lang);

  const { order, currencySymbol: dataCurrencySymbol, ...settings } = data;
  const currencySymbol = dataCurrencySymbol || '₹'; 
  
  const orderItemsArray = React.useMemo(() => {
    if (Array.isArray(order.items)) {
        return order.items;
    }
    if (typeof order.items === 'string') {
        try {
            const parsed = JSON.parse(order.items);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse order items string in InvoicePreview:", order.items, e);
            return [];
        }
    }
    return [];
  }, [order.items]);
  
  const subtotalInBase = orderItemsArray.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotalInDisplay = convertPrice(subtotalInBase);

  const formattedDate = React.useMemo(() => {
    const dateValue = order.createdAt;
    if (!dateValue) return "Date not available";
    
    try {
        const date = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
        if (!isValid(date)) {
            console.warn(`[OrderCard] Invalid createdAt date for order ${order.id}: "${dateValue}"`);
            return "Invalid date";
        }
        return format(date, "MMM d, yyyy, h:mm a");
    } catch (e) {
        console.warn(`[OrderCard] Could not parse createdAt date for order ${order.id}: "${dateValue}"`, e);
        return "Invalid date";
    }
  }, [order.createdAt, order.id]);
  
  const formattedDateThermal = React.useMemo(() => {
    const dateValue = order.createdAt;
    if (!dateValue) return "N/A";
    try {
        const date = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
        return isValid(date) ? format(date, "dd/MM/yy HH:mm") : "Invalid Date";
    } catch (e) {
        return "Invalid Date";
    }
  }, [order.createdAt]);
  
  const serviceChargePercentage = data.serviceChargePercentage !== undefined ? data.serviceChargePercentage : (settings.serviceChargePercentage || 0);

  let discountAmount = 0;
  if (data.discount && data.discount.value > 0) {
      if(data.discount.type === 'percentage') {
          discountAmount = subtotalInDisplay * (data.discount.value / 100);
      } else {
          discountAmount = convertPrice(data.discount.value);
      }
  }

  const serviceChargeAmount = subtotalInDisplay * (serviceChargePercentage / 100);
  
  const totalBeforeDiscount = subtotalInDisplay + serviceChargeAmount;
  const finalDiscountAmount = discountAmount;
  const totalAfterDiscount = Math.max(0, totalBeforeDiscount - finalDiscountAmount);
  
  const applicableGstRate = React.useMemo(() => {
      if (settings.isCompositionScheme) return 5;
      if (settings.establishmentType === 'hotel' && settings.hotelTariffBracket === 'above_7500') return 18;
      return 5;
  }, [settings.isCompositionScheme, settings.establishmentType, settings.hotelTariffBracket]);

  const gstAmount = settings.isCompositionScheme ? 0 : totalAfterDiscount * (applicableGstRate / 100);
  const vatAmount = settings.isCompositionScheme ? 0 : totalAfterDiscount * ((settings.vatPercentage || 0) / 100);
  const taxableForCess = totalAfterDiscount + gstAmount + vatAmount;
  const cessAmount = settings.isCompositionScheme ? 0 : taxableForCess * ((settings.cessPercentage || 0) / 100);

  const grandTotalInDisplay = totalAfterDiscount + gstAmount + vatAmount + cessAmount;
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
      <p className="text-center font-semibold my-1 text-xs">{settings.invoiceHeaderText}</p>
    ),
    orderDetails: (
      <div className="text-[0.65rem] my-1 space-y-px text-center">
        <hr className="border-t border-dashed border-black my-1" />
        <p>{labels.orderId} #{String(order.id).substring(0,10)}</p>
        <p>{labels.date} {formattedDateThermal}</p>
        <p>{labels.customer} {order.customerName.substring(0, 30)}</p>
        {order.orderType === 'Dine-in' && order.tableNumber && <p>{labels.table} {order.tableNumber} ({order.orderType})</p>}
        {order.orderType !== 'Dine-in' && <p>{labels.orderType} {order.orderType}</p>}
        {order.paymentId && order.paymentType !== 'Pending' && <p className="truncate">{labels.paymentId} {order.paymentId} ({order.paymentType})</p>}
        {order.paymentType === 'Pending' && <p className="font-semibold">{labels.paymentStatusPending}</p>}
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
            <p>({labels.qtyTableHeader} x {labels.priceTableHeader})</p>
            {showCalculatedCost && <span className="text-right"></span>}
            <span className="text-right"></span>
        </div>
        <hr className="border-t border-dashed border-black my-0.5" />
        <div className="space-y-0.5 text-[0.65rem] py-0.5">
          {orderItemsArray.map((item: OrderItem, index: number) => {
            const itemPriceInDisplay = convertPrice(item.price);
            const itemTotalInDisplay = itemPriceInDisplay * item.quantity;
            let itemName = item.name; if (item.selectedPortion && item.selectedPortion !== "fixed") { itemName += ` (${item.selectedPortion})`; }
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
                  <p className="col-span-1">{itemNameLine}{showCalculatedCost && item.currentCalculatedCost !== undefined ? ` (${BASE_CURRENCY_CODE}${item.currentCalculatedCost.toFixed(2)})` : ''}</p>
                  {showCalculatedCost && <p className="text-right">{currencySymbol}{itemPriceInDisplay.toFixed(2)}</p>}
                  <p className="text-right">{currencySymbol}{itemTotalInDisplay.toFixed(2)}</p>
                </div>
                 <div className={cn("flex justify-between px-2", showCalculatedCost && "grid grid-cols-[2fr_1fr_1fr] items-start")}>
                    <p>  {item.quantity}x{showCalculatedCost ? '' : `₹${itemPriceInDisplay.toFixed(2)}`}</p>
                    {showCalculatedCost && <span className="text-right"></span>}
                    <span className="text-right">{showCalculatedCost ? '' : ''}</span>
                </div>
                {item.note && <p className="px-2 text-[0.6rem] italic">  {labels.itemNotePrefix} {item.note.substring(0, 25)}</p>}
                {showNutritionalInfo && nutritionString && <p className="px-2 text-[0.55rem] text-gray-600">  Nutri: {nutritionString} {item.servingSizeSuggestion ? `(${item.servingSizeSuggestion.substring(0,15)})` : ''}</p>}
              </React.Fragment>
            );
          })}
        </div>
        <hr className="border-t border-dashed border-black my-0.5" />
      </div>
    ),
    totals: (
      <div className="my-1 pt-0.5 space-y-px text-[0.65rem] text-right px-1">
        <p>{labels.subtotalLabel} {currencySymbol}{subtotalInDisplay.toFixed(2)}</p>
        {serviceChargeAmount > 0 && <p>{labels.serviceChargeLabel} ({serviceChargePercentage}%): {currencySymbol}{serviceChargeAmount.toFixed(2)}</p>}
        {finalDiscountAmount > 0 && <p className="font-semibold">{labels.discountLabel} -{currencySymbol}{finalDiscountAmount.toFixed(2)}</p>}
        {gstAmount > 0 && <p>{labels.gstLabel} ({applicableGstRate}%): {currencySymbol}{gstAmount.toFixed(2)}</p>}
        {vatAmount > 0 && <p>{labels.vatLabel} ({settings.vatPercentage}%): {currencySymbol}{vatAmount.toFixed(2)}</p>}
        {cessAmount > 0 && <p>{labels.cessLabel} ({settings.cessPercentage}%): {currencySymbol}{cessAmount.toFixed(2)}</p>}
        <p className="font-bold text-xs mt-0.5">{labels.grandTotalLabel} {currencySymbol}{grandTotalInDisplay.toFixed(2)}</p>
        {showCalculatedCost && totalCalculatedCostInBase > 0 && (
            <p className="text-xs text-muted-foreground">{labels.totalCalculatedCostLabel} {BASE_CURRENCY_CODE} {totalCalculatedCostInBase.toFixed(2)}</p>
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
    footerText1: renderSection(settings.printElements.showInvoiceFooterText1 && !!data.invoiceFooterText1,
      <p className="text-center text-[0.65rem] italic pt-1 mt-1 border-t border-dashed border-black">{data.invoiceFooterText1}</p>
    ),
    footerText2: renderSection(settings.printElements.showInvoiceFooterText2 && !!settings.invoiceFooterText2,
      <p className={`text-center text-[0.55rem] mt-0.5`}>{settings.invoiceFooterText2?.substring(0, 80)}</p>
    ),
    closingMessage: <p className={`text-center font-semibold text-[0.7rem] pt-1 mt-1`}>{labels.thankYouMessage}</p>,
  };

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
          {order.phone && (
            <>
              <div><strong>{labels.phone}</strong></div>
              <div>{order.phone}</div>
            </>
          )}
          {order.orderType === 'Dine-in' && order.tableNumber && 
            <><div><strong>{labels.table}</strong></div><div>{order.tableNumber}</div></>
          }
          <div><strong>{labels.orderType}</strong></div><div>{order.orderType}</div>
          {order.paymentId && order.paymentType !== 'Pending' && 
            <><div><strong>{labels.paymentId}</strong></div><div className="truncate">{order.paymentId} ({order.paymentType})</div></>
          }
          {order.paymentType === 'Pending' && 
            <><div><strong>Payment:</strong></div><div className="font-semibold text-destructive">{labels.paymentStatusPending}</div></>
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
              <th className="text-right font-semibold p-2 border-b">{labels.totalTableHeader}</th>
            </tr>
          </thead>
          <tbody>
            {orderItemsArray.map((item: OrderItem, index: number) => {
              const itemPriceInDisplay = convertPrice(item.price);
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
                    {item.note && <div className="text-[0.75rem] text-muted-foreground italic pl-1">{labels.itemNotePrefix} {item.note}</div>}
                    {showNutritionalInfo && nutritionString && <div className="text-xs text-muted-foreground">{nutritionString} {item.servingSizeSuggestion ? `(${item.servingSizeSuggestion})` : ''}</div>}
                  </td>
                  <td className="text-center p-2">{item.quantity}</td>
                  <td className="text-right p-2">{currencySymbol}{itemPriceInDisplay.toFixed(2)}</td>
                  {showCalculatedCost && <td className="text-right p-2 cost-column-cell">{item.currentCalculatedCost !== undefined ? `${BASE_CURRENCY_CODE} ${(item.currentCalculatedCost * item.quantity).toFixed(2)}` : 'N/A'}</td>}
                  <td className="text-right p-2">{currencySymbol}{itemTotalInDisplay.toFixed(2)}</td>
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
          <div className="flex justify-between"><span>{labels.subtotalLabel}</span><span>{currencySymbol}{subtotalInDisplay.toFixed(2)}</span></div>
          {serviceChargeAmount > 0 && <div className="flex justify-between"><span>{labels.serviceChargeLabel} ({serviceChargePercentage}%):</span><span>{currencySymbol}{serviceChargeAmount.toFixed(2)}</span></div>}
          {finalDiscountAmount > 0 && <div className="flex justify-between text-green-600"><span>{labels.discountLabel}</span><span>-{currencySymbol}{finalDiscountAmount.toFixed(2)}</span></div>}
          {gstAmount > 0 && (<div className="flex justify-between"><span>{labels.gstLabel} ({applicableGstRate}%):</span><span>{currencySymbol}{gstAmount.toFixed(2)}</span></div>)}
          {vatAmount > 0 && (<div className="flex justify-between"><span>{labels.vatLabel} ({settings.vatPercentage}%):</span><span>{currencySymbol}{vatAmount.toFixed(2)}</span></div>)}
          {cessAmount > 0 && (<div className="flex justify-between"><span>{labels.cessLabel} ({settings.cessPercentage}%):</span><span>{currencySymbol}{cessAmount.toFixed(2)}</span></div>)}
          <hr className="my-1 border-muted-foreground/50"/>
          <div className={`flex justify-between font-bold mt-1 ${previewType === 'email' ? 'text-lg' : 'text-xl'}`}><span>{labels.grandTotalLabel}</span><span>{currencySymbol}{grandTotalInDisplay.toFixed(2)}</span></div>
           {showCalculatedCost && totalCalculatedCostInBase > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
              <span>{labels.totalCalculatedCostLabel}</span>
              <span>{BASE_CURRENCY_CODE} {totalCalculatedCostInBase.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    ),
    taxInfo: ((settings.printElements.showPanNumber && settings.panNumber) || (settings.printElements.showGstNumber && settings.gstNumber) || (settings.printElements.showFssaiNumber && settings.fssaiNumber)) ? (
      <div className="text-center space-y-0.5 text-xs text-muted-foreground pt-3 mt-3 border-t">
          {renderSection(settings.printElements.showPanNumber && !!settings.panNumber, <p>{labels.panLabel} {settings.panNumber}</p>)}
          {renderSection(settings.printElements.showGstNumber && !!settings.gstNumber, <p>{labels.gstinLabel} {settings.gstNumber}</p>)}
          {renderSection(settings.printElements.showFssaiNumber && !!settings.fssaiNumber, <p>{labels.fssaiLabel} {settings.fssaiNumber}</p>)}
      </div>
    ) : null,
    qrCodeOrder: renderSection(settings.printElements.showScanForOrderQR && !!settings.scanForOrderQRUrl,
      <div className="flex justify-center items-center mt-4 pt-4 border-t">
        <div className="text-center">
          <NextImage src={settings.scanForOrderQRUrl} alt="Order QR" width={70} height={70} className="mx-auto object-contain" data-ai-hint="qr code menu"/>
          <p className="text-xs mt-1 text-muted-foreground">{labels.scanForMenuOrder}</p>
        </div>
      </div>
    ),
    qrCodePay: renderSection(settings.printElements.showScanForPayQR && !!settings.scanForPayQRUrl,
      <div className="flex justify-center items-center mt-4 pt-4 border-t">
        <div className="text-center">
          <NextImage src={settings.scanForPayQRUrl} alt="Pay QR" width={70} height={70} className="mx-auto object-contain" data-ai-hint="qr code payment"/>
          <p className="text-xs mt-1 text-muted-foreground">{labels.scanToPay}</p>
        </div>
      </div>
    ),
    footerText1: renderSection(settings.printElements.showInvoiceFooterText1 && !!data.invoiceFooterText1,
      <p className="text-center mt-4 pt-4 border-t text-sm italic text-muted-foreground">{data.invoiceFooterText1}</p>
    ),
    footerText2: renderSection(settings.printElements.showInvoiceFooterText2 && !!settings.invoiceFooterText2,
      <p className="text-center mt-2 text-xs text-muted-foreground">{settings.invoiceFooterText2}</p>
    ),
    closingMessage: <p className="text-center mt-4 pt-2 border-t text-md font-semibold">{labels.thankYouMessage}</p>,
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

