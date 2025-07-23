// src/lib/types/order.types.ts
import type { OrderItem } from './menu.types';

export const ALL_PAYMENT_TYPES = ['Pending', 'Cash', 'Card', 'UPI', 'Online', 'Room Charge'] as const;
export type PaymentType = typeof ALL_PAYMENT_TYPES[number];

export const ALL_ORDER_STATUSES = ['Pending', 'Preparing', 'Ready for Pickup', 'Out for Delivery', 'Completed', 'Cancelled'] as const;
export type OrderStatus = typeof ALL_ORDER_STATUSES[number];

export const ALL_ORDER_TYPES = ['Dine-in', 'Takeaway', 'In-Room Dining'] as const;
export type OrderType = typeof ALL_ORDER_TYPES[number];

export interface OrderHistoryEvent {
  status: OrderStatus;
  timestamp: string; // ISO 8601 timestamp for when this status was set
  notes?: string; // e.g., "Order created", "Status updated by admin"
}

export interface Order {
  id: string;
  userId?: string;
  items: OrderItem[] | string; // Can be array or JSON string
  total: number; // Total in BASE_CURRENCY_CODE
  status: OrderStatus;
  orderType: OrderType;
  outletId?: string; // Link to an Outlet
  customerName: string;
  customerGstin?: string; // New: For B2B invoices
  phone?: string;
  email?: string;
  orderTime?: string; // For pre-orders or specific requested times
  createdAt: string | Date; // ISO 8601 timestamp when order is placed
  bookingId?: string; // Link to a room booking
  tableNumber?: string; // For Dine-in orders
  paymentType?: PaymentType;
  paymentId?: string; // Transaction ID from payment gateway
  notes?: string; // General notes for the entire order
  history?: OrderHistoryEvent[]; // New field for tracking status changes
}
