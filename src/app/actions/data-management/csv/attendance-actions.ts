// src/app/actions/data-management/csv/attendance-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { ATTENDANCE_HEADERS } from '../_csv-headers';
import type { AttendanceRecord } from '@/lib/types';
import { ALL_ATTENDANCE_STATUSES } from '@/lib/types';

const attendanceCsvPath = path.join(dataDir, 'attendance.csv');

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const rawData = await readCsvFile<any>(attendanceCsvPath, ATTENDANCE_HEADERS);
  return rawData.map(record => ({
    id: String(record.id || crypto.randomUUID()),
    employeeId: String(record.employeeId),
    date: record.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    checkInTime: record.checkInTime ? new Date(record.checkInTime).toISOString() : undefined,
    checkOutTime: record.checkOutTime ? new Date(record.checkOutTime).toISOString() : undefined,
    status: ALL_ATTENDANCE_STATUSES.includes(record.status) ? record.status : 'Absent',
    notes: record.notes || undefined,
  }));
}

export async function saveAttendanceRecords(records: AttendanceRecord[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = records.map(rec => ({
      ...rec,
      date: new Date(rec.date).toISOString().split('T')[0],
      checkInTime: rec.checkInTime ? new Date(rec.checkInTime).toISOString() : '',
      checkOutTime: rec.checkOutTime ? new Date(rec.checkOutTime).toISOString() : '',
  }));
  const csvHeaders = ATTENDANCE_HEADERS.trim().split(',');
  return overwriteCsvFile(attendanceCsvPath, dataForCsv, csvHeaders);
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
