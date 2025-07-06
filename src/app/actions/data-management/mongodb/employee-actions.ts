// src/app/actions/data-management/mongodb/employee-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { Employee } from '@/lib/types';
import Papa from 'papaparse';
import { EMPLOYEES_HEADERS } from '../_csv-headers';

export async function getEmployees(): Promise<Employee[]> {
  const { db } = await connectToDatabase();
  const employees = await db.collection('employees').find({}).toArray();
  return employees.map(fromMongo) as Employee[];
}

export async function saveEmployees(employees: Employee[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('employees').deleteMany({});
        if (employees.length > 0) {
            const employeesWithObjectIds = employees.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                dateOfJoining: rest.dateOfJoining ? new Date(rest.dateOfJoining) : undefined,
            }));
            const result = await db.collection('employees').insertMany(employeesWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} employees.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all employees.', count: 0 };
    } catch (error) {
        console.error("Error saving employees to MongoDB:", error);
        return { success: false, message: `Error saving employees to MongoDB: ${(error as Error).message}` };
    }
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
    return Papa.unparse(dataForCsv, { header: true, columns: EMPLOYEES_HEADERS.trim().split(',') });
}

export async function uploadEmployeesCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
        return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
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
