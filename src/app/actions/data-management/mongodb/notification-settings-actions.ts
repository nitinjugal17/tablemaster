// src/app/actions/data-management/mongodb/notification-settings-actions.ts
'use server';
import { connectToDatabase } from '@/lib/mongodb';
import type { NotificationSettings } from '@/lib/types';
import { defaultNotificationSettings } from '@/lib/types';

// Define a specific type for this document
interface NotificationSettingsDoc extends NotificationSettings {
    _id: 'notifications';
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
    const { db } = await connectToDatabase();
    // Use the specific document type to inform TypeScript about the _id
    const settings = await db.collection<NotificationSettingsDoc>('settings').findOne({ _id: 'notifications' });
    if (settings) {
        const { _id, ...rest } = settings;
        return { ...defaultNotificationSettings, ...rest, admin: {...defaultNotificationSettings.admin, ...rest.admin}, user: {...defaultNotificationSettings.user, ...rest.user} };
    }
    return defaultNotificationSettings;
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<{ success: boolean; message: string; }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection<NotificationSettingsDoc>('settings').updateOne(
            { _id: 'notifications' },
            { $set: settings },
            { upsert: true }
        );
        return { success: true, message: "Notification settings saved successfully to MongoDB." };
    } catch (error) {
        console.error("Error saving notification settings to MongoDB:", error);
        return { success: false, message: `Error saving notification settings to MongoDB: ${(error as Error).message}` };
    }
}
