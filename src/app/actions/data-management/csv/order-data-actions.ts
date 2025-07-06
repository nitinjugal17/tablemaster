// src/app/actions/data-management/order-data-actions.ts
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { ORDERS_HEADERS } from '../_csv-headers';
import type { Order, OrderItem } from '@/lib/types';

const ordersCsvPath = path.join(dataDir, 'orders.csv');

export async function getOrders(): Promise<Order[]> {
    const rawData = await readCsvFile<any>(ordersCsvPath, ORDERS_HEADERS);
    return rawData.map(order => {
        let parsedItems: OrderItem[] = [];
        if (typeof order.items === 'string') {
            try {
                parsedItems = JSON.parse(order.items);
                if (!Array.isArray(parsedItems)) {
                    parsedItems = [];
                } else {
                    parsedItems = parsedItems.map(it => ({
                        ...it,
                        menuItemId: String(it.menuItemId || crypto.randomUUID()),
                        name: String(it.name || 'Unknown Item'),
                        price: Number(it.price) || 0,
                        quantity: Number(it.quantity) || 1,
                        selectedPortion: it.selectedPortion || undefined,
                        note: it.note || undefined, 
                    }));
                }
            } catch (e) {
                parsedItems = [];
            }
        } else if (Array.isArray(order.items)) { 
             parsedItems = order.items.map((it: any) => ({
                menuItemId: String(it.menuItemId || crypto.randomUUID()),
                name: String(it.name || 'Unknown Item'),
                price: Number(it.price) || 0,
                quantity: Number(it.quantity) || 1,
                selectedPortion: it.selectedPortion || undefined,
                note: it.note || undefined, 
            }));
        }
        let finalCreatedAt: string;
        if (!order.createdAt || String(order.createdAt).trim() === "") {
            finalCreatedAt = new Date(0).toISOString(); 
        } else if (typeof order.createdAt === 'number') { 
            finalCreatedAt = new Date(order.createdAt).toISOString();
        } else if (order.createdAt instanceof Date) { 
            finalCreatedAt = order.createdAt.toISOString();
        } else {
             try {
                finalCreatedAt = new Date(String(order.createdAt)).toISOString();
                if (finalCreatedAt === "Invalid Date") throw new Error("Invalid date string");
            } catch {
                finalCreatedAt = new Date(0).toISOString();
            }
        }
        return {
            ...order,
            id: String(order.id), 
            userId: order.userId ? String(order.userId) : undefined, // Read userId
            items: parsedItems,
            total: parseFloat(String(order.total)) || 0,
            status: order.status || 'Pending',
            orderType: order.orderType || 'Takeaway',
            customerName: order.customerName || 'Guest',
            phone: order.phone || undefined,
            email: order.email || undefined,
            orderTime: order.orderTime || undefined,
            createdAt: finalCreatedAt,
            paymentType: order.paymentType || 'Pending',
        };
    });
}

export async function saveOrders(orders: Order[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataToSaveForCsv = orders.map(order => ({
    ...order,
    userId: order.userId || "", 
    items: JSON.stringify(order.items.map(it => ({ ...it, selectedPortion: it.selectedPortion || undefined }))),
    phone: order.phone || "",
    email: order.email || "",
    orderTime: order.orderTime || "",
  }));
  const csvHeaders = ORDERS_HEADERS.trim().split(',');
  return overwriteCsvFile(ordersCsvPath, dataToSaveForCsv, csvHeaders);
}

export async function downloadOrdersCsv(): Promise<string> {
  try {
    const orders = await getOrders(); 
    if (orders.length === 0) return ORDERS_HEADERS;
    const dataForCsv = orders.map(order => ({
      ...order,
      userId: order.userId || "",
      items: JSON.stringify(order.items.map(it => ({ ...it, selectedPortion: it.selectedPortion || undefined }))), 
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date(0).toISOString(),
      phone: order.phone || "",
      email: order.email || "",
      orderTime: order.orderTime || "",
    }));
    const csvHeaders = ORDERS_HEADERS.trim().split(',');
    return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
  } catch (error) {
    console.error(`[Order Data Action] Error generating Orders CSV for download: ${(error as Error).message}`);
    return ORDERS_HEADERS;
  }
}

export async function uploadOrdersCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const parsed = Papa.parse<any>(csvString, { 
      header: true,
      dynamicTyping: false, 
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      const errorMessages = parsed.errors.map(e => `Row ${e.row !== undefined ? e.row + 1 : 'N/A'}: ${e.message} (${e.code})`).join('; ');
      return { success: false, message: `CSV parsing errors: ${errorMessages}. File not saved.` };
    }
    
    let processedData: Order[];
    try {
        processedData = parsed.data.map((order, index) => {
            let parsedItems: OrderItem[];
            if (typeof order.items !== 'string') {
                 if (Array.isArray(order.items)) {
                    parsedItems = order.items.map((it:any) => ({
                        menuItemId: String(it.menuItemId || crypto.randomUUID()),
                        name: String(it.name || 'Unknown Item'),
                        price: Number(it.price) || 0,
                        quantity: Number(it.quantity) || 1,
                        selectedPortion: it.selectedPortion || undefined,
                        note: it.note || undefined, 
                    }));
                 } else {
                    parsedItems = [];
                 }
            } else { 
                try {
                    parsedItems = JSON.parse(order.items as string);
                    if (!Array.isArray(parsedItems)) {
                         parsedItems = [];
                    } else {
                        parsedItems = parsedItems.map(it => ({
                            menuItemId: String(it.menuItemId || crypto.randomUUID()),
                            name: String(it.name || 'Unknown Item'),
                            price: Number(it.price) || 0,
                            quantity: Number(it.quantity) || 1,
                            selectedPortion: it.selectedPortion || undefined,
                            note: it.note || undefined, 
                        }));
                    }
                } catch (jsonError) {
                    throw new Error(`Row ${index + 2}: Invalid JSON in 'items' field: ${(jsonError as Error).message}.`);
                }
            }
            
            let finalCreatedAt = order.createdAt;
            if (typeof order.createdAt === 'number') {
              finalCreatedAt = new Date(order.createdAt).toISOString();
            } else if (!order.createdAt || String(order.createdAt).trim() === "") {
              finalCreatedAt = new Date(0).toISOString();
            } else {
               try {
                 finalCreatedAt = new Date(String(order.createdAt)).toISOString();
                  if (finalCreatedAt === "Invalid Date") {
                      throw new Error("Invalid date string");
                  }
               } catch {
                 finalCreatedAt = new Date(0).toISOString();
               }
            }

            return {
                id: String(order.id || crypto.randomUUID()),
                userId: order.userId ? String(order.userId) : undefined, // Handle userId on upload
                items: parsedItems,
                total: parseFloat(order.total as string) || 0,
                status: order.status || 'Pending',
                orderType: order.orderType || 'Takeaway',
                customerName: order.customerName || 'Guest',
                phone: order.phone || undefined,
                email: order.email || undefined,
                orderTime: order.orderTime || undefined,
                createdAt: finalCreatedAt,
                tableNumber: order.tableNumber || undefined,
                paymentType: order.paymentType || 'Pending',
                paymentId: order.paymentId || '',
            };
        });
    } catch (processingError) {
        return { success: false, message: (processingError as Error).message + " File not saved."};
    }
    
    return saveOrders(processedData);

  } catch (error) {
    console.error(`[Order Data Action] Error processing Orders CSV upload: ${(error as Error).message}`);
    return { success: false, message: `Error processing/saving CSV: ${(error as Error).message}` };
  }
}
