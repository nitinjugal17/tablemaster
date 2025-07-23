// src/lib/types/integrations.types.ts

export type IntegrationPlatform = 'zomato' | 'swiggy';

export interface IntegrationSetting {
  id: string; // e.g., 'zomato-settings'
  platform: IntegrationPlatform;
  isEnabled: boolean;
  apiKey?: string;
  otherSettings?: string; // JSON string for other platform-specific settings
}
