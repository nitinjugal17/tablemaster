// src/app/actions/data-management/mongodb/index.ts
// This is a barrel file for re-exporting MongoDB-based data actions.
// It should not contain the 'use server' directive itself.

export * from './user-actions';
export * from './menu-item-actions';
export * from './order-actions';
export * from './currency-rate-actions';
export * from './general-settings-actions';
export * from './printer-settings-actions';
export * from './booking-actions';
export * from './table-actions';
export * from './room-actions';
export * from './role-permission-actions';
export * from './discount-actions';
export * from './offer-actions';
export * from './banner-actions';
export * from './image-management-actions';
export * from './stock-item-actions';
export * from './expense-actions';
export * from './stock-menu-mapping-actions';
export * from './rate-limit-actions';
export * from './employee-actions';
export * from './attendance-actions';
export * from './salary-payment-actions';
export * from './notification-settings-actions';
export * from './room-stock-actions';
export * from './menu-actions';
export * from './addon-actions';
export * from './feedback-actions';
export * from './feedback-category-actions';

import { getDbStatus } from '@/lib/mongodb';
import { getUsers } from './user-actions';

export async function getDataSource() {
  return 'mongodb';
}
export async function getDbConnectionStatus() {
  return getDbStatus();
}

export async function checkSystemReady(): Promise<{ isReady: boolean; message?: string }> {
    const status = await getDbStatus();
    if (!status.isConnected) {
      // This is a bit redundant because the dispatcher already falls back,
      // but it's a good safety check.
      return { isReady: false, message: 'Database connection failed. The application cannot start.' };
    }
    const users = await getUsers();
    if (users.length === 0 || !users.some(u => u.role === 'superadmin')) {
      return { 
        isReady: false, 
        message: 'System initialization incomplete: No superadmin user found in the database. Please create one to proceed.' 
      };
    }
  return { isReady: true };
}
