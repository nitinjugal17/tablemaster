// src/lib/types/hr.types.ts

export interface Employee {
  id: string; // Unique identifier for the employee record
  employeeId: string; // The official, user-facing employee ID (e.g., "EMP-001")
  name: string;
  designation: string;
  baseSalary?: number; // In BASE_CURRENCY_CODE
  salaryCalculationType?: 'daily' | 'monthly';
  department?: string;
  dateOfJoining?: string; // ISO 8601
  mappedUserId?: string; // The ID of the User from users.csv, if linked
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'On Leave';
export const ALL_ATTENDANCE_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'On Leave'];

export interface AttendanceRecord {
  id: string; // Unique ID for the record
  employeeId: string; // Links to the Employee
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO 8601 timestamp for when record was created
  checkInTime?: string; // ISO 8601 timestamp
  checkOutTime?: string; // ISO 8601 timestamp
  status: AttendanceStatus;
  notes?: string; // e.g., "Manual entry by admin", "OTP verified"
}

export interface SalaryPayment {
    id: string;
    paymentDate: string; // ISO 8601 when the payment was recorded
    periodFrom: string; // ISO 8601 start of the salary period
    periodTo: string; // ISO 8601 end of the salary period
    employeeId: string;
    employeeName: string;
    baseSalaryForPeriod: number;
    bonusForPeriod: number;
    deductions: number;
    netPay: number;
}
