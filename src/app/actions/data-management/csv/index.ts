// src/app/actions/data-management/csv/index.ts
// This is a barrel file for re-exporting CSV-based data actions.
// It should not contain the 'use server' directive itself.

export * from './user-actions';
export * from './menu-item-actions';
export * from './order-data-actions';
export * from './currency-rate-actions';
export * from './general-settings-actions';
export * from './printer-settings-actions';
export * from './booking-data-actions';
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

import { getEncryptionKeyStatus } from '../_csv-base-actions';

export async function getDataSource() {
  return 'csv';
}
export async function getDbConnectionStatus() {
  return { isConnected: false, message: 'Data source is CSV, not MongoDB.' };
}

// CSV is always "ready" as files are created on demand.
export async function checkSystemReady() {
  return { isReady: true };
}

// Explicitly re-export to satisfy "use server" constraints in the dispatcher
export async function getEncryptionStatus() {
    return getEncryptionKeyStatus();
}
