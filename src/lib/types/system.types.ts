// src/lib/types/system.types.ts

export interface DailyAvailability {
    date: string; // YYYY-MM-DD
    disabledMenuItemIds: string[];
}

export const defaultDailyAvailability: DailyAvailability = {
    date: new Date().toISOString().split('T')[0],
    disabledMenuItemIds: []
};
