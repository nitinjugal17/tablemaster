// src/app/actions/data-management/mongodb/booking-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { Booking, OrderItem } from '@/lib/types';
import Papa from 'papaparse';
import { BOOKINGS_HEADERS } from '../_csv-headers';

export async function getBookings(): Promise<Booking[]> {
  const { db } = await connectToDatabase();
  const bookings = await db.collection('bookings').find({}).toArray();
  return bookings.map(fromMongo) as Booking[];
}

export async function saveBookings(bookings: Booking[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('bookings').deleteMany({});
        if (bookings.length > 0) {
            const bookingsWithObjectIds = bookings.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                date: new Date(rest.date), // Store as Date object
            }));
            const result = await db.collection('bookings').insertMany(bookingsWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} bookings.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all bookings.', count: 0 };
    } catch (error) {
        console.error("Error saving bookings to MongoDB:", error);
        return { success: false, message: `Error saving bookings to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadBookingsCsv(): Promise<string> {
  const bookings = await getBookings();
  if (bookings.length === 0) return BOOKINGS_HEADERS;
  const dataForCsv = bookings.map(booking => ({
    ...booking,
    userId: booking.userId || "",
    items: booking.items ? JSON.stringify(booking.items) : "",
    date: new Date(booking.date).toISOString().split('T')[0],
  }));
  return Papa.unparse(dataForCsv, { header: true, columns: BOOKINGS_HEADERS.trim().split(',') });
}

export async function uploadBookingsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const bookingsToSave: Booking[] = parsed.data.map((booking, index) => {
        let parsedItems: OrderItem[] | undefined = undefined;
        if (typeof booking.items === 'string' && booking.items.trim()) {
            try {
                parsedItems = JSON.parse(booking.items);
                if (!Array.isArray(parsedItems)) parsedItems = undefined;
            } catch(e) {
                throw new Error(`Row ${index + 2}: Invalid JSON in 'items' field for booking '${booking.id}'.`);
            }
        } else if (Array.isArray(booking.items)) {
            parsedItems = booking.items;
        }

        return {
            id: String(booking.id || crypto.randomUUID()),
            userId: booking.userId || undefined,
            bookingType: ['table', 'room'].includes(booking.bookingType) ? booking.bookingType : 'table',
            date: booking.date || new Date().toISOString().split('T')[0],
            time: booking.time || "00:00",
            partySize: Number(booking.partySize) || 1,
            customerName: booking.customerName || 'Guest',
            phone: booking.phone || '',
            email: booking.email || '',
            items: parsedItems,
            status: ['pending', 'confirmed', 'cancelled'].includes(booking.status) ? booking.status : 'pending',
            requestedResourceId: booking.requestedResourceId || undefined,
            assignedResourceId: booking.assignedResourceId || undefined,
            notes: booking.notes || '',
        };
    });
  return saveBookings(bookingsToSave);
}
