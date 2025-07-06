// src/lib/types/user.types.ts

// UserRole can be one of the defaults or a custom string for extensibility
export type UserRole = 'user' | 'admin' | 'superadmin' | string;
export const DEFAULT_USER_ROLES: UserRole[] = ['user', 'admin', 'superadmin'];

export type AccountStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';
export const ALL_ACCOUNT_STATUSES: AccountStatus[] = ['active', 'inactive', 'suspended', 'pending_verification'];

export interface User {
  id: string;
  email: string;
  password?: string; // Should be hashed in a real app. Plaintext for prototype.
  role: UserRole;
  name?: string;
  phone?: string;
  accountStatus: AccountStatus;
  loyaltyPoints?: number;
}
