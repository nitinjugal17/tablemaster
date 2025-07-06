// src/app/actions/data-management/employee-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { EMPLOYEES_HEADERS } from '../_csv-headers';
import type { Employee } from '@/lib/types';
import { isValid, parseISO } from 'date-fns';

const employeesCsvPath = path.join(dataDir, 'employees.csv');

export async function getEmployees(): Promise<Employee[]> {
  const rawData = await readCsvFile<any>(employeesCsvPath, EMPLOYEES_HEADERS);
  return rawData.map(employee => {
    let dateOfJoining: string | undefined = undefined;
    if (employee.dateOfJoining && typeof employee.dateOfJoining === 'string' && employee.dateOfJoining.trim() !== "") {
      try {
        // Attempt to parse various common date formats before falling back to ISO
        const parsedDate = new Date(employee.dateOfJoining);
        if (isValid(parsedDate)) {
          dateOfJoining = parsedDate.toISOString();
        } else {
           console.warn(`Could not parse dateOfJoining for employee ${employee.employeeId}: ${employee.dateOfJoining}`);
        }
      } catch (e) {
        console.warn(`Error parsing dateOfJoining for employee ${employee.employeeId}: ${employee.dateOfJoining}`, e);
      }
    }
    
    return {
      id: String(employee.id || crypto.randomUUID()),
      employeeId: String(employee.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`),
      name: employee.name || 'Unnamed Employee',
      designation: employee.designation || 'Staff',
      department: employee.department || undefined,
      dateOfJoining: dateOfJoining,
      mappedUserId: employee.mappedUserId || undefined,
      baseSalary: employee.baseSalary ? Number(employee.baseSalary) : undefined,
      salaryCalculationType: ['daily', 'monthly'].includes(employee.salaryCalculationType) ? employee.salaryCalculationType : 'monthly',
    };
  });
}

export async function saveEmployees(employees: Employee[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = employees.map(emp => ({
      ...emp,
      dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : '', 
      baseSalary: emp.baseSalary || 0,
      salaryCalculationType: emp.salaryCalculationType || 'monthly',
  }));
  const csvHeaders = EMPLOYEES_HEADERS.trim().split(',');
  return overwriteCsvFile(employeesCsvPath, dataForCsv, csvHeaders);
}

export async function downloadEmployeesCsv(): Promise<string> {
  const items = await getEmployees();
  if (items.length === 0) return EMPLOYEES_HEADERS;
  const dataForCsv = items.map(emp => ({
      ...emp,
      dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : '',
      baseSalary: emp.baseSalary || 0,
      salaryCalculationType: emp.salaryCalculationType || 'monthly',
  }));
  const csvHeaders = EMPLOYEES_HEADERS.trim().split(',');
  return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
}

export async function uploadEmployeesCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
    return { success: false, message: `CSV parsing errors: ${errorMessages}` };
  }
  const validatedData: Employee[] = parsed.data.map(emp => ({
    id: String(emp.id || crypto.randomUUID()),
    employeeId: String(emp.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`),
    name: emp.name || 'Unnamed Employee',
    designation: emp.designation || 'Staff',
    department: emp.department || undefined,
    dateOfJoining: emp.dateOfJoining && new Date(emp.dateOfJoining).toString() !== 'Invalid Date' ? new Date(emp.dateOfJoining).toISOString() : undefined,
    mappedUserId: emp.mappedUserId || undefined,
    baseSalary: emp.baseSalary ? Number(emp.baseSalary) : undefined,
    salaryCalculationType: ['daily', 'monthly'].includes(emp.salaryCalculationType) ? emp.salaryCalculationType : 'monthly',
  }));
  return saveEmployees(validatedData);
}
