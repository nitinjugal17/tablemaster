// src/app/actions/data-management/mongodb/room-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { Room } from '@/lib/types';
import Papa from 'papaparse';
import { ROOMS_HEADERS } from '../_csv-headers';


export async function getRooms(): Promise<Room[]> {
  const { db } = await connectToDatabase();
  const roomsFromDb = await db.collection('rooms').find({}).toArray();
  // In MongoDB, `imageUrls` is an array. Convert it to a comma-separated string to match the `Room` type definition.
  const rooms = roomsFromDb.map(room => ({
      ...fromMongo(room),
      imageUrls: Array.isArray(room.imageUrls) ? room.imageUrls.join(',') : '',
  })) as Room[];
  return rooms;
}

export async function saveRooms(rooms: Room[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('rooms').deleteMany({});
        if (rooms.length > 0) {
            const roomsWithObjectIds = rooms.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                // `imageUrls` in the `Room` type is a string. Split it into an array for MongoDB.
                imageUrls: typeof rest.imageUrls === 'string' ? rest.imageUrls.split(',').map(url => url.trim()).filter(Boolean) : [],
            }));
            const result = await db.collection('rooms').insertMany(roomsWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} rooms.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all rooms.', count: 0 };
    } catch (error) {
        console.error("Error saving rooms to MongoDB:", error);
        return { success: false, message: `Error saving rooms to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadRoomsCsv(): Promise<string> {
  const rooms = await getRooms();
  if (rooms.length === 0) return ROOMS_HEADERS;
  // The 'getRooms' function already converts imageUrls array to a string, so it's ready for CSV.
  return Papa.unparse(rooms, { header: true, columns: ROOMS_HEADERS.trim().split(',') });
}

export async function uploadRoomsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const validatedData: Room[] = parsed.data.map(room => ({
      id: String(room.id || crypto.randomUUID()),
      name: room.name || 'Unnamed Room',
      description: room.description || '',
      capacity: Number(room.capacity) || 0,
      pricePerNight: parseFloat(String(room.pricePerNight)) || 0,
      amenities: room.amenities || '',
      imageUrls: room.imageUrls || '',
    }));
    return saveRooms(validatedData);
}
