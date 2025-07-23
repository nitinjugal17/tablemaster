// src/lib/types/restaurant.types.ts
import type { OrderItem } from './menu.types';

export const ALL_TABLE_STATUSES = ['Available', 'Occupied', 'Reserved', 'Maintenance'] as const;
export type TableStatus = typeof ALL_TABLE_STATUSES[number];

export interface RestaurantTable {
  id: string;
  name: string; // e.g., "T1", "Window Booth 2", "Patio 5"
  capacity: number;
  status: TableStatus;
  outletId?: string; // Link to an Outlet
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

export const ALL_BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type BookingStatus = typeof ALL_BOOKING_STATUSES[number];

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
  items?: OrderItem[] | string; // Can be array or JSON string
  status: BookingStatus;
  requestedResourceId?: string; // ID of table/room specifically requested by customer
  assignedResourceId?: string; // ID of table/room assigned by admin
  notes?: string; 
  createdAt?: string; // ISO 8601 timestamp for when booking was created
}

export const ALL_OUTLET_TYPES = ['restaurant', 'bar', 'cafe', 'room_service', 'banquet_hall', 'other'] as const;
export type OutletType = typeof ALL_OUTLET_TYPES[number];

export interface Outlet {
    id: string;
    name: string;
    type: OutletType;
    description?: string;
}
