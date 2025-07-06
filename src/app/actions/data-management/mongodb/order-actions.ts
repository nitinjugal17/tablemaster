// src/app/actions/data-management/mongodb/order-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { Order, OrderItem } from '@/lib/types';
import Papa from 'papaparse';
import { ORDERS_HEADERS } from '../_csv-headers';

export async function getOrders(): Promise<Order[]> {
  const { db } = await connectToDatabase();
  const orders = await db.collection('orders').find({}).toArray();
  return orders.map(fromMongo) as Order[];
}

export async function saveOrders(orders: Order[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('orders').deleteMany({});
        if (orders.length > 0) {
            const ordersWithObjectIds = orders.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                createdAt: new Date(rest.createdAt), // Ensure date is a Date object
            }));
            const result = await db.collection('orders').insertMany(ordersWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} orders.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all orders.', count: 0 };
    } catch (error) {
        console.error("Error saving orders to MongoDB:", error);
        return { success: false, message: `Error saving orders to MongoDB: ${(error as Error).message}` };
    }
}


export async function downloadOrdersCsv(): Promise<string> {
    const items = await getOrders();
    if (items.length === 0) return ORDERS_HEADERS;
    const dataForCsv = items.map(order => ({
        ...order,
        items: JSON.stringify(order.items), // Convert array to JSON string for CSV
    }));
    return Papa.unparse(dataForCsv, { header: true, columns: ORDERS_HEADERS.trim().split(',') });
}

export async function uploadOrdersCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const dataToSave: Order[] = parsed.data.map((order: any, index: number) => {
        let parsedItems: OrderItem[] = [];
        if (typeof order.items === 'string' && order.items.trim()) {
            try {
                parsedItems = JSON.parse(order.items);
                if (!Array.isArray(parsedItems)) parsedItems = [];
            } catch (e) {
                throw new Error(`Row ${index + 2}: Invalid JSON in 'items' field for order '${order.id}'.`);
            }
        } else if (Array.isArray(order.items)) {
            parsedItems = order.items;
        }

        return {
            id: order.id || crypto.randomUUID(),
            userId: order.userId,
            items: parsedItems,
            total: parseFloat(order.total),
            status: order.status,
            orderType: order.orderType,
            customerName: order.customerName,
            phone: order.phone,
            email: order.email,
            orderTime: order.orderTime,
            createdAt: order.createdAt,
            tableNumber: order.tableNumber,
            paymentType: order.paymentType,
            paymentId: order.paymentId,
        };
    });
    return saveOrders(dataToSave);
}
