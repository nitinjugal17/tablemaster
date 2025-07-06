'use server';

import { sendEmail } from '@/lib/emailService';
import type { Expense, StockItem, InvoiceSetupSettings, AttendanceRecord, Employee } from '@/lib/types';
import { 
    getExpenses, 
    getStockItems, 
    getGeneralSettings, 
    getAttendanceRecords, 
    getEmployees 
} from './data-management-actions';
import { format, parseISO } from 'date-fns';
import Papa from 'papaparse';


const emailStyles = `
  body { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f7f6; margin: 0; padding: 0; }
  .container { max-width: 700px; margin: 20px auto; background-color: #ffffff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 15px rgba(0,0,0,0.1); }
  .header { text-align: center; border-bottom: 2px solid #A93226; padding-bottom: 15px; margin-bottom: 20px; }
  .header h2 { color: #A93226; margin: 0; font-size: 24px; }
  .header p { color: #555555; font-size: 14px; margin-top: 5px; }
  .section-title { font-size: 18px; color: #A93226; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eeeeee; padding-bottom: 5px;}
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
  th, td { border: 1px solid #dddddd; padding: 10px; text-align: left; }
  th { background-color: #f2ebd3; color: #333; font-weight: bold; }
  tr:nth-child(even) { background-color: #f9f9f9; }
  .text-right { text-align: right; }
  .footer { text-align: center; font-size: 12px; color: #888888; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eeeeee; }
  .empty-state { padding: 20px; text-align: center; color: #777; background-color: #fdfdfd; border: 1px dashed #ddd; border-radius: 4px; }
`;

function formatExpensesForEmail(expenses: Expense[], currencySymbol: string, dateRange?: { from: string; to: string }): string {
  const reportPeriod = dateRange 
    ? `${format(parseISO(dateRange.from), "MMM d, yyyy")} to ${format(parseISO(dateRange.to), "MMM d, yyyy")}`
    : "All Time";

  if (expenses.length === 0) return `<div class='empty-state'><p>No expenses recorded for the period: ${reportPeriod}.</p></div>`;
  
  let html = `<h3 class='section-title'>Expenses Summary (${reportPeriod})</h3><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class='text-right'>Amount</th></tr></thead><tbody>`;
  expenses.forEach(e => {
    html += `<tr><td>${format(new Date(e.date), 'MMM d, yyyy')}</td><td>${e.description}</td><td>${e.category}</td><td class='text-right'>${currencySymbol}${e.amount.toFixed(2)}</td></tr>`;
  });
  html += "</tbody></table>";
  return html;
}

function formatInventoryForEmail(stockItems: StockItem[], currencySymbol: string): string {
  if (stockItems.length === 0) return "<div class='empty-state'><p>No inventory items found (Current Snapshot).</p></div>";
  let html = "<h3 class='section-title'>Inventory Summary (Current Snapshot)</h3><table><thead><tr><th>Item</th><th>Category</th><th class='text-right'>Current Stock</th><th class='text-right'>Reorder Level</th><th class='text-right'>Purchase Price</th></tr></thead><tbody>";
  stockItems.forEach(item => {
    html += `<tr><td>${item.name}</td><td>${item.category}</td><td class='text-right'>${item.currentStock} ${item.unit}</td><td class='text-right'>${item.reorderLevel} ${item.unit}</td><td class='text-right'>${currencySymbol}${item.purchasePrice.toFixed(2)}</td></tr>`;
  });
  html += "</tbody></table>";
  return html;
}

function formatAttendanceForEmail(records: AttendanceRecord[], employees: Employee[], dateRange?: { from: string; to: string }): string {
  const reportPeriod = dateRange
    ? `${format(parseISO(dateRange.from), "MMM d, yyyy")} to ${format(parseISO(dateRange.to), "MMM d, yyyy")}`
    : "All Time";

  if (records.length === 0) return `<div class='empty-state'><p>No attendance records for the period: ${reportPeriod}.</p></div>`;

  const employeeMap = new Map(employees.map(e => [e.employeeId, e.name]));

  let html = `<h3 class='section-title'>Attendance Report (${reportPeriod})</h3><table><thead><tr><th>Date</th><th>Employee</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Notes</th></tr></thead><tbody>`;
  records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(r => {
    const employeeName = employeeMap.get(r.employeeId) || r.employeeId;
    html += `<tr>
        <td>${format(parseISO(r.date), 'MMM d, yyyy')}</td>
        <td>${employeeName}</td>
        <td>${r.checkInTime ? format(parseISO(r.checkInTime), 'h:mm a') : 'N/A'}</td>
        <td>${r.checkOutTime ? format(parseISO(r.checkOutTime), 'h:mm a') : 'N/A'}</td>
        <td>${r.status}</td>
        <td>${r.notes || ''}</td>
      </tr>`;
  });
  html += "</tbody></table>";
  return html;
}

export async function sendExpenseInventoryReportByEmail({
  recipientEmail,
  dateRange,
  reportTriggerContext = "Automated System" 
}: {
  recipientEmail: string;
  dateRange?: { from: string; to: string };
  reportTriggerContext?: string;
}): Promise<{ success: boolean; message: string; messageId?: string }> {
  if (!recipientEmail) {
    return { success: false, message: "Recipient email is required." };
  }

  try {
    const settings = await getGeneralSettings(); 
    const allExpenses = await getExpenses(); 
    const stockItems = await getStockItems(); 

    let filteredExpenses = allExpenses;
    if (dateRange && dateRange.from && dateRange.to) {
        const fromDate = parseISO(dateRange.from);
        const toDate = parseISO(dateRange.to);
        filteredExpenses = allExpenses.filter(expense => {
            try {
                const expenseDate = parseISO(expense.date);
                return expenseDate >= fromDate && expenseDate <= toDate;
            } catch (e) { return false; }
        });
    }
    
    const expensesHtml = formatExpensesForEmail(filteredExpenses, settings.currencySymbol, dateRange);
    const inventoryHtml = formatInventoryForEmail(stockItems, settings.currencySymbol);
    
    const reportPeriodString = dateRange 
        ? `${format(parseISO(dateRange.from), "MMMM d, yyyy")} to ${format(parseISO(dateRange.to), "MMMM d, yyyy")}`
        : "All Time (Expenses) / Current (Inventory)";
        
    const subject = `${settings.companyName} - Expense & Inventory Report - ${dateRange ? format(parseISO(dateRange.from), "MMM d") + " to " + format(parseISO(dateRange.to), "MMM d, yyyy") : "Summary"}`;
    
    const htmlContent = `
      <html>
        <head><style>${emailStyles}</style></head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${settings.companyName}</h2>
              <p>Expense & Inventory Report</p>
            </div>
            <p><strong>Report Generated:</strong> ${format(new Date(), "MMMM d, yyyy, h:mm a")}</p>
            <p><strong>Triggered By:</strong> ${reportTriggerContext}</p>
            <p><strong>Reporting Period (Expenses):</strong> ${reportPeriodString}</p>
            
            ${expensesHtml}
            ${inventoryHtml}
            
            <div class="footer">
              <p>This report was generated from TableMaster.</p>
              <p>${settings.companyName} &copy; ${new Date().getFullYear()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

     const emailResult = await sendEmail({ to: recipientEmail, subject, html: htmlContent });

     if (!emailResult.success) { return { success: false, message: emailResult.message }; }
     return { success: true, message: "Report email sent successfully.", messageId: emailResult.messageId };

  } catch (error) {
    console.error("Error generating/sending report:", error);
    return { success: false, message: `Failed to send report: ${(error as Error).message}` };
  }
}

export async function sendAttendanceReportByEmail({
  recipientEmail,
  dateRange,
}: {
  recipientEmail: string;
  dateRange: { from: string; to: string };
}): Promise<{ success: boolean; message: string; messageId?: string }> {
  if (!recipientEmail) { return { success: false, message: "Recipient email is required." }; }

  try {
    const settings = await getGeneralSettings();
    const allAttendance = await getAttendanceRecords();
    const allEmployees = await getEmployees();
    
    const fromDate = parseISO(dateRange.from);
    const toDate = parseISO(dateRange.to);
    const filteredRecords = allAttendance.filter(record => {
      try { const recordDate = parseISO(record.date); return recordDate >= fromDate && recordDate <= toDate; } 
      catch (e) { return false; }
    });

    const attendanceHtml = formatAttendanceForEmail(filteredRecords, allEmployees, dateRange);
    const subject = `${settings.companyName} - Attendance Report - ${format(fromDate, "MMM d")} to ${format(toDate, "MMM d, yyyy")}`;

    const htmlContent = `
      <html><head><style>${emailStyles}</style></head><body>
        <div class="container">
          <div class="header"><h2>${settings.companyName}</h2><p>Attendance Report</p></div>
          <p><strong>Report Generated:</strong> ${format(new Date(), "MMMM d, yyyy, h:mm a")}</p>
          <p><strong>Reporting Period:</strong> ${format(fromDate, "MMMM d, yyyy")} to ${format(toDate, "MMMM d, yyyy")}</p>
          ${attendanceHtml}
          <div class="footer"><p>This report was generated from TableMaster.</p></div>
        </div></body></html>`;

    const emailResult = await sendEmail({ to: recipientEmail, subject, html: htmlContent });

    if (!emailResult.success) { return { success: false, message: emailResult.message }; }
    return { success: true, message: "Attendance report email sent successfully.", messageId: emailResult.messageId };
  } catch (error) {
    console.error("Error sending attendance report:", error);
    return { success: false, message: `Failed to send report: ${(error as Error).message}` };
  }
}


export async function downloadAttendanceReportCsv({
  dateRange
}: {
  dateRange: { from: string; to: string };
}): Promise<string> {
    const allAttendance = await getAttendanceRecords();
    const allEmployees = await getEmployees();
    const employeeMap = new Map(allEmployees.map(e => [e.employeeId, e.name]));

    const fromDate = parseISO(dateRange.from);
    const toDate = parseISO(dateRange.to);
    const filteredRecords = allAttendance.filter(record => {
      try { const recordDate = parseISO(record.date); return recordDate >= fromDate && recordDate <= toDate; } 
      catch (e) { return false; }
    });

    const dataForCsv = filteredRecords.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(rec => ({
      Date: format(parseISO(rec.date), 'yyyy-MM-dd'),
      Employee_ID: rec.employeeId,
      Employee_Name: employeeMap.get(rec.employeeId) || 'Unknown',
      Check_In: rec.checkInTime ? format(parseISO(rec.checkInTime), 'HH:mm:ss') : '',
      Check_Out: rec.checkOutTime ? format(parseISO(rec.checkOutTime), 'HH:mm:ss') : '',
      Status: rec.status,
      Notes: rec.notes || ''
    }));

    return Papa.unparse(dataForCsv, { header: true });
}
