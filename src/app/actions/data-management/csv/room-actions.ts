// src/app/actions/data-management/csv/room-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { ROOMS_HEADERS } from '../_csv-headers';
import type { Room } from '@/lib/types';

const roomsCsvPath = path.join(dataDir, 'rooms.csv');

export async function getRooms(): Promise<Room[]> {
  const rawData = await readCsvFile<any>(roomsCsvPath, ROOMS_HEADERS);
  return rawData.map(room => ({
    id: String(room.id || crypto.randomUUID()),
    name: room.name || 'Unnamed Room',
    description: room.description || '',
    capacity: Number(room.capacity) || 0,
    pricePerNight: parseFloat(String(room.pricePerNight)) || 0,
    amenities: room.amenities || '',
    imageUrls: room.imageUrls || '',
  }));
}

export async function saveRooms(rooms: Room[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = rooms.map(room => ({
    id: String(room.id || crypto.randomUUID()),
    name: room.name,
    description: room.description,
    capacity: room.capacity,
    pricePerNight: room.pricePerNight,
    amenities: room.amenities,
    imageUrls: room.imageUrls,
  }));
  const csvHeaders = ROOMS_HEADERS.trim().split(',');
  return overwriteCsvFile(roomsCsvPath, dataForCsv, csvHeaders);
}

export async function downloadRoomsCsv(): Promise<string> {
  const rooms = await getRooms();
  if (rooms.length === 0) return ROOMS_HEADERS;
  const csvHeaders = ROOMS_HEADERS.trim().split(',');
  return Papa.unparse(rooms, { header: true, columns: csvHeaders });
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
