// src/app/actions/data-management/booking-data-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from './_csv-base-actions';
import { BOOKINGS_HEADERS } from './_csv-headers';
import type { Booking, OrderItem } from '@/lib/types';

const bookingsCsvPath = path.join(dataDir, 'bookings.csv');

export async function getBookings(): Promise<Booking[]> {
  const rawData = await readCsvFile<any>(bookingsCsvPath, BOOKINGS_HEADERS);
  return rawData.map(booking => {
      let parsedItems: OrderItem[] | undefined = undefined;
      if (typeof booking.items === 'string' && booking.items.trim() !== "") {
          try {
              parsedItems = JSON.parse(booking.items);
              if (!Array.isArray(parsedItems)) {
                  parsedItems = [];
              } else {
                  parsedItems = parsedItems.map(it => ({
                      menuItemId: String(it.menuItemId || crypto.randomUUID()),
                      name: String(it.name || 'Unknown Item'),
                      price: Number(it.price) || 0,
                      quantity: Number(it.quantity) || 1,
                      selectedPortion: it.selectedPortion || undefined,
                      note: it.note || undefined, 
                  }));
              }
          } catch (e) {
              console.warn(`Could not parse items for booking ${booking.id}: ${booking.items}`);
              parsedItems = [];
          }
      } else if (Array.isArray(booking.items)) { 
           parsedItems = booking.items.map((it: any) => ({
              menuItemId: String(it.menuItemId || crypto.randomUUID()),
              name: String(it.name || 'Unknown Item'),
              price: Number(it.price) || 0,
              quantity: Number(it.quantity) || 1,
              selectedPortion: it.selectedPortion || undefined,
              note: it.note || undefined, 
          }));
      }
      return {
          id: String(booking.id),
          userId: booking.userId ? String(booking.userId) : undefined, 
          bookingType: ['table', 'room'].includes(booking.bookingType) ? booking.bookingType : 'table',
          date: booking.date || new Date().toISOString().split('T')[0],
          time: booking.time || "00:00",
          partySize: Number(booking.partySize) || 1,
          customerName: booking.customerName || 'Guest',
          phone: booking.phone || '',
          email: booking.email || '',
          items: parsedItems,
          status: booking.status || 'pending',
          requestedResourceId: booking.requestedResourceId || booking.requestedTableId || undefined,
          assignedResourceId: booking.assignedResourceId || booking.assignedTableId || undefined,
          notes: booking.notes || '',
      };
  });
}

export async function saveBookings(bookings: Booking[]): Promise<{ success: boolean; message: string; count?: number }> {
  console.log('[Booking Data Action] Attempting to save bookings CSV.');
  const dataForCsv = bookings.map(booking => ({
    ...booking,
    userId: booking.userId || "", 
    items: booking.items ? JSON.stringify(booking.items.map(it => ({ ...it, selectedPortion: it.selectedPortion || undefined }))) : "", 
  }));
  const csvHeaders = BOOKINGS_HEADERS.trim().split(',');
  return overwriteCsvFile(bookingsCsvPath, dataForCsv, csvHeaders);
}

export async function downloadBookingsCsv(): Promise<string> {
  try {
    const bookings = await getBookings();
    if (bookings.length === 0) return BOOKINGS_HEADERS;
    const dataForCsv = bookings.map(booking => ({
      ...booking,
      userId: booking.userId || "",
      items: booking.items ? JSON.stringify(booking.items.map(it => ({ ...it, selectedPortion: it.selectedPortion || undefined }))) : "",
    }));
    const csvHeaders = BOOKINGS_HEADERS.trim().split(',');
    return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
  } catch (error) {
    console.error(`[Booking Data Action] Error generating Bookings CSV for download: ${(error as Error).message}`);
    return BOOKINGS_HEADERS;
  }
}

export async function uploadBookingsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
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

    const bookingsToSave: Booking[] = parsed.data.map((booking, index) => {
      let parsedItems: OrderItem[] | undefined = undefined;
      if (typeof booking.items === 'string' && booking.items.trim() !== "") {
        try {
          parsedItems = JSON.parse(booking.items);
          if (!Array.isArray(parsedItems)) {
            parsedItems = [];
          } else {
            parsedItems = parsedItems.map(it => ({
                menuItemId: String(it.menuItemId || crypto.randomUUID()),
                name: String(it.name || 'Unknown Item'),
                price: Number(it.price) || 0,
                quantity: Number(it.quantity) || 1,
                selectedPortion: it.selectedPortion || undefined,
                note: it.note || undefined, 
            }));
          }
        } catch (jsonError) {
          throw new Error(`Row ${index + 2}: Invalid JSON in 'items' field for booking '${booking.id}': ${(jsonError as Error).message}.`);
        }
      }
      const validStatus = ['pending', 'confirmed', 'cancelled'].includes(booking.status) ? booking.status : 'pending';
      const validBookingType = ['table', 'room'].includes(booking.bookingType) ? booking.bookingType : 'table';

      return {
        id: String(booking.id || crypto.randomUUID()),
        userId: booking.userId ? String(booking.userId) : undefined,
        bookingType: validBookingType as Booking['bookingType'],
        date: booking.date || new Date().toISOString().split('T')[0],
        time: booking.time || "00:00",
        partySize: Number(booking.partySize) || 1,
        customerName: booking.customerName || 'Guest',
        phone: booking.phone || '',
        email: booking.email || '',
        items: parsedItems,
        status: validStatus as Booking['status'],
        requestedResourceId: booking.requestedResourceId || booking.requestedTableId || undefined,
        assignedResourceId: booking.assignedResourceId || booking.assignedTableId || undefined,
        notes: booking.notes || '',
      };
    });

    return saveBookings(bookingsToSave);
  } catch (error) {
    console.error(`[Booking Data Action] Error processing Bookings CSV upload: ${(error as Error).message}`);
    return { success: false, message: `Error processing uploaded bookings CSV: ${(error as Error).message}` };
  }
}
