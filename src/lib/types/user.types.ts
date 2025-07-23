// src/lib/types/user.types.ts

// UserRole can be one of the defaults or a custom string for extensibility
export const DEFAULT_USER_ROLES = ['user', 'admin', 'superadmin'] as const;
export type UserRole = typeof DEFAULT_USER_ROLES[number] | string;

export const ALL_ACCOUNT_STATUSES = ['active', 'inactive', 'suspended', 'pending_verification'] as const;
export type AccountStatus = typeof ALL_ACCOUNT_STATUSES[number];

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
