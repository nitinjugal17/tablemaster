

'use server';

import type { Employee, AttendanceRecord, SalaryPayment } from '@/lib/types';
import { format, startOfDay } from 'date-fns';
import { sendEmail } from '@/lib/emailService';
import { 
    getEmployees, 
    saveEmployees, 
    getAttendanceRecords, 
    saveAttendanceRecords, 
    saveSalaryPayments as recordSalaryPayments,
    getUsers
} from '@/app/actions/data-management-actions';

// In-memory store for attendance OTPs (CONCEPTUAL for dev, not production-ready)
const attendanceOtps: Record<string, { otp: string, timestamp: number }> = {};
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOrUpdateEmployee(employeeData: Partial<Employee>): Promise<{ success: boolean; message: string; employee?: Employee }> {
  try {
    const allEmployees = await getEmployees();
    let updatedEmployees: Employee[];
    let finalEmployee: Employee;

    if (employeeData.id) {
      const existingIndex = allEmployees.findIndex(e => e.id === employeeData.id);
      if (existingIndex === -1) {
        return { success: false, message: "Employee not found for update." };
      }
      finalEmployee = { ...allEmployees[existingIndex], ...employeeData } as Employee;
      allEmployees[existingIndex] = finalEmployee;
      updatedEmployees = allEmployees;
    } else {
      const newId = `emp-${crypto.randomUUID().substring(0, 8)}`;
      finalEmployee = {
        id: newId,
        employeeId: employeeData.employeeId || `EMP-${Date.now().toString().slice(-4)}`,
        name: employeeData.name || 'Unnamed',
        designation: employeeData.designation || 'Staff',
        department: employeeData.department || undefined,
        dateOfJoining: employeeData.dateOfJoining || undefined,
        mappedUserId: employeeData.mappedUserId === '__NONE__' ? undefined : employeeData.mappedUserId,
        baseSalary: employeeData.baseSalary,
        salaryCalculationType: employeeData.salaryCalculationType,
      };
      updatedEmployees = [...allEmployees, finalEmployee];
    }
    
    const saveResult = await saveEmployees(updatedEmployees);
    if (saveResult.success) {
      return { success: true, message: `Employee "${finalEmployee.name}" saved successfully.`, employee: finalEmployee };
    } else {
      return { success: false, message: `Failed to save employee data: ${saveResult.message}` };
    }

  } catch (error) {
    console.error("Error in createOrUpdateEmployee action:", error);
    return { success: false, message: `An unexpected server error occurred: ${(error as Error).message}` };
  }
}

export async function markAttendance(employeeId: string, notes?: string): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  try {
    const allAttendance = await getAttendanceRecords();
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const nowISO = new Date().toISOString();

    const todaysRecordIndex = allAttendance.findIndex(r => r.employeeId === employeeId && r.date === today);

    if (todaysRecordIndex > -1) {
      const existingRecord = allAttendance[todaysRecordIndex];
      if (existingRecord.checkOutTime) return { success: false, message: "Already checked out for today." };
      
      allAttendance[todaysRecordIndex].checkOutTime = nowISO;
      allAttendance[todaysRecordIndex].notes = notes ? `${existingRecord.notes || ''}; Check-out: ${notes}` : existingRecord.notes;
      const saveResult = await saveAttendanceRecords(allAttendance);
      if (saveResult.success) return { success: true, message: `Successfully checked out at ${format(new Date(nowISO), 'h:mm a')}.`, record: allAttendance[todaysRecordIndex] };
      return { success: false, message: `Failed to save check-out: ${saveResult.message}` };

    } else {
      const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        employeeId: employeeId,
        date: today,
        createdAt: nowISO, // Add createdAt timestamp
        checkInTime: nowISO,
        status: 'Present',
        notes: notes ? `Check-in via ${notes}` : 'Manual entry',
      };
      const updatedRecords = [...allAttendance, newRecord];
      const saveResult = await saveAttendanceRecords(updatedRecords);
      if (saveResult.success) return { success: true, message: `Successfully checked in at ${format(new Date(nowISO), 'h:mm a')}.`, record: newRecord };
      return { success: false, message: `Failed to save check-in: ${saveResult.message}` };
    }
  } catch (error) {
    console.error("Error in markAttendance action:", error);
    return { success: false, message: `An unexpected server error occurred: ${(error as Error).message}` };
  }
}


export async function getEmployeeAndTodaysAttendance(userId: string): Promise<{ employee: Employee | null; attendance: AttendanceRecord | null; error?: string }> {
    try {
        const allEmployees = await getEmployees();
        const employee = allEmployees.find(e => e.mappedUserId === userId) || null;

        if (!employee) {
            return { employee: null, attendance: null };
        }

        const allAttendance = await getAttendanceRecords();
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const attendance = allAttendance.find(r => r.employeeId === employee.employeeId && r.date === today) || null;

        return { employee, attendance };
    } catch (error) {
        console.error("Error fetching employee and attendance status:", error);
        return { employee: null, attendance: null, error: (error as Error).message };
    }
}

export async function requestAndSendAttendanceOtp(userId: string): Promise<{ success: boolean, message: string, messageId?: string }> {
    try {
        const allUsers = await getUsers();
        const user = allUsers.find(u => u.id === userId);
        if (!user || !user.email) {
            return { success: false, message: "User or user email not found." };
        }

        const otp = generateOtp();
        attendanceOtps[user.email] = { otp, timestamp: Date.now() };

        const subject = 'Your TableMaster Attendance Verification OTP';
        const htmlContent = `<p>Your OTP for marking attendance is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`;
        
        console.log(`[HR Action] Generated Attendance OTP for ${user.email}: ${otp}`);

        if (!process.env.SMTP_HOST) {
            const message = `DEV MODE: Attendance OTP for ${user.email} is ${otp}.`;
            console.warn(message);
            return { success: true, message: `Attendance OTP generated (dev only, logged to console as SMTP is not configured). OTP: ${otp}`, messageId: "mock_otp_console_log" };
        }

        const emailResult = await sendEmail({ to: user.email, subject, html: htmlContent });
        if (!emailResult.success) {
            return { success: false, message: `Failed to send OTP email: ${emailResult.message}` };
        }

        return { success: true, message: "OTP sent to your registered email.", messageId: emailResult.messageId };
    } catch (error) {
        console.error("Error in requestAndSendAttendanceOtp:", error);
        return { success: false, message: "An unexpected error occurred while sending OTP." };
    }
}

export async function verifyOtpAndMarkAttendance(userId: string, otp: string): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
    try {
        const allUsers = await getUsers();
        const user = allUsers.find(u => u.id === userId);
        if (!user || !user.email) {
            return { success: false, message: "User not found for OTP verification." };
        }

        const storedOtpData = attendanceOtps[user.email];
        const DEV_OTP = "123456"; 

        if (!storedOtpData || storedOtpData.otp !== otp) {
            if (otp !== DEV_OTP || !!process.env.SMTP_HOST) {
                 return { success: false, message: "Invalid OTP." };
            }
        }
        
        if (storedOtpData && (Date.now() - storedOtpData.timestamp > OTP_EXPIRY_MS)) {
            delete attendanceOtps[user.email];
            return { success: false, message: "OTP has expired." };
        }
        
        delete attendanceOtps[user.email]; 

        const allEmployees = await getEmployees();
        const employee = allEmployees.find(e => e.mappedUserId === userId);
        if (!employee) {
            return { success: false, message: "No employee profile is linked to your user account." };
        }
        
        return markAttendance(employee.employeeId, 'user OTP verification');

    } catch (error) {
        console.error("Error in verifyOtpAndMarkAttendance:", error);
        return { success: false, message: `An unexpected server error occurred: ${(error as Error).message}` };
    }
}

export async function saveSalaryPayments(payments: SalaryPayment[]): Promise<{ success: boolean; message: string; }> {
    try {
        const result = await recordSalaryPayments(payments);
        if (result.success) {
            return { success: true, message: `Successfully recorded ${payments.length} salary payment(s).` };
        } else {
            return { success: false, message: `Failed to save salary payments: ${result.message}` };
        }
    } catch (error) {
        console.error("Error saving salary payments action:", error);
        return { success: false, message: `An unexpected server error occurred: ${(error as Error).message}` };
    }
}
