// src/app/actions/data-management/mongodb/attendance-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { AttendanceRecord } from '@/lib/types';
import { ALL_ATTENDANCE_STATUSES } from '@/lib/types';
import Papa from 'papaparse';
import { ATTENDANCE_HEADERS } from '../_csv-headers';


export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const { db } = await connectToDatabase();
  const records = await db.collection('attendance').find({}).toArray();
  return records.map(fromMongo) as AttendanceRecord[];
}

export async function saveAttendanceRecords(records: AttendanceRecord[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('attendance').deleteMany({});
        if (records.length > 0) {
            const recordsWithObjectIds = records.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                date: new Date(rest.date),
                checkInTime: rest.checkInTime ? new Date(rest.checkInTime) : undefined,
                checkOutTime: rest.checkOutTime ? new Date(rest.checkOutTime) : undefined,
            }));
            const result = await db.collection('attendance').insertMany(recordsWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} attendance records.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all attendance records.', count: 0 };
    } catch (error) {
        console.error("Error saving attendance records to MongoDB:", error);
        return { success: false, message: `Error saving attendance records to MongoDB: ${(error as Error).message}` };
    }
}

export async function downloadAttendanceRecordsCsv(): Promise<string> {
  const items = await getAttendanceRecords();
  if (items.length === 0) return ATTENDANCE_HEADERS;
  const dataForCsv = items.map(rec => ({
      ...rec,
      date: new Date(rec.date).toISOString().split('T')[0],
      checkInTime: rec.checkInTime ? new Date(rec.checkInTime).toISOString() : '',
      checkOutTime: rec.checkOutTime ? new Date(rec.checkOutTime).toISOString() : '',
  }));
  const csvHeaders = ATTENDANCE_HEADERS.trim().split(',');
  return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
}

export async function uploadAttendanceRecordsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
    return { success: false, message: `CSV parsing errors: ${errorMessages}` };
  }
  
  const validatedData: AttendanceRecord[] = parsed.data.map(rec => {
      if (!rec.employeeId || !rec.date) {
        throw new Error("employeeId and date are required for each attendance record.");
      }
      return {
        id: String(rec.id || crypto.randomUUID()),
        employeeId: String(rec.employeeId),
        date: rec.date ? new Date(rec.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        checkInTime: rec.checkInTime && new Date(rec.checkInTime).toString() !== 'Invalid Date' ? new Date(rec.checkInTime).toISOString() : undefined,
        checkOutTime: rec.checkOutTime && new Date(rec.checkOutTime).toString() !== 'Invalid Date' ? new Date(rec.checkOutTime).toISOString() : undefined,
        status: ALL_ATTENDANCE_STATUSES.includes(rec.status) ? rec.status : 'Absent',
        notes: rec.notes || undefined,
      };
  });
  return saveAttendanceRecords(validatedData);
}
