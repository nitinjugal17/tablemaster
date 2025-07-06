
// src/lib/types/restaurant.types.ts
import type { OrderItem } from './menu.types';

export type TableStatus = 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
export const ALL_TABLE_STATUSES: TableStatus[] = ['Available', 'Occupied', 'Reserved', 'Maintenance'];

export interface RestaurantTable {
  id: string;
  name: string; // e.g., "T1", "Window Booth 2", "Patio 5"
  capacity: number;
  status: TableStatus;
  notes?: string; // e.g., "Near window", "High-traffic area", "Requires extra cleaning"
}

export interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number; // Stored in BASE_CURRENCY_CODE
  amenities: string; // Comma-separated list of amenities
  imageUrls: string; // Comma-separated list of image URLs
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export const ALL_BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'cancelled'];

export interface Booking {
  id: string;
  userId?: string; 
  bookingType: 'table' | 'room'; // To distinguish the booking type
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24-hour format)
  partySize: number;
  customerName: string;
  phone: string;
  email?: string; 
  items?: OrderItem[]; 
  status: BookingStatus;
  requestedResourceId?: string; // ID of table/room specifically requested by customer
  assignedResourceId?: string; // ID of table/room assigned by admin
  notes?: string; 
}
