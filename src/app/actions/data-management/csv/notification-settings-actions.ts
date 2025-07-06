// src/app/actions/data-management/csv/notification-settings-actions.ts
'use server';
import fs from 'fs/promises';
import path from 'path';
import CryptoJS from 'crypto-js';
import { dataDir } from '../_csv-base-actions'; 
import type { NotificationSettings } from '@/lib/types';
import { defaultNotificationSettings } from '@/lib/types';

const notificationSettingsJsonPath = path.join(dataDir, 'notification-settings.json');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; 

export async function getNotificationSettings(): Promise<NotificationSettings> {
  console.log(`[Notification Settings Action] Attempting to read JSON file: ${notificationSettingsJsonPath}`);
  try {
    let fileContent = await fs.readFile(notificationSettingsJsonPath, 'utf-8');
    let wasDecrypted = false;

    if (ENCRYPTION_KEY) {
      console.log(`[Notification Settings Action] Encryption key found. Attempting to decrypt ${path.basename(notificationSettingsJsonPath)}.`);
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(fileContent, ENCRYPTION_KEY);
        const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (decryptedText) {
          if (decryptedText.trim().startsWith('{') && decryptedText.trim().endsWith('}')) {
            fileContent = decryptedText;
            wasDecrypted = true;
            console.log(`[Notification Settings Action] Successfully decrypted JSON content from ${path.basename(notificationSettingsJsonPath)}.`);
          } else {
            console.warn(`[Notification Settings Action] Decryption of ${path.basename(notificationSettingsJsonPath)} resulted in non-JSON-like content. Proceeding with original content.`);
          }
        } else if (fileContent.trim() !== '') {
          console.warn(`[Notification Settings Action] Decryption of ${path.basename(notificationSettingsJsonPath)} resulted in empty content, but original was not. Proceeding with original content.`);
        }
      } catch (decryptionError) {
        console.warn(`[Notification Settings Action] Error during decryption attempt for ${path.basename(notificationSettingsJsonPath)}: ${(decryptionError as Error).message}. Proceeding with original content.`);
      }
    } else {
        console.log(`[Notification Settings Action] No encryption key found. Parsing ${path.basename(notificationSettingsJsonPath)} as plaintext JSON.`);
    }
    
    const settings = JSON.parse(fileContent);
    console.log(`[Notification Settings Action] Parsed notification settings from ${path.basename(notificationSettingsJsonPath)} (${wasDecrypted ? 'decrypted' : 'plaintext'}).`);
    // Ensure all keys from default are present
    const finalSettings = { ...defaultNotificationSettings, ...settings, admin: {...defaultNotificationSettings.admin, ...settings.admin}, user: {...defaultNotificationSettings.user, ...settings.user} };
    return finalSettings; 
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`[Notification Settings Action] Notification settings file not found: ${path.basename(notificationSettingsJsonPath)}. Returning default settings and attempting to create file.`);
      try {
        await saveNotificationSettings(defaultNotificationSettings); 
      } catch (saveError) {
        console.error(`[Notification Settings Action] Failed to create default notification settings file: ${(saveError as Error).message}`);
      }
      return defaultNotificationSettings;
    }
    console.error(`[Notification Settings Action] Error reading notification settings from ${path.basename(notificationSettingsJsonPath)}, returning defaults:`, (error as Error).message);
    return defaultNotificationSettings;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<{ success: boolean; message: string }> {
  console.log('[Notification Settings Action] Attempting to save notification settings JSON.');
  try {
    let contentToSave = JSON.stringify(settings, null, 2);
    let wasEncrypted = false;

    if (ENCRYPTION_KEY) {
      try {
        contentToSave = CryptoJS.AES.encrypt(contentToSave, ENCRYPTION_KEY).toString();
        wasEncrypted = true;
        console.log(`[Notification Settings Action] Encrypted content for ${path.basename(notificationSettingsJsonPath)}.`);
      } catch (encError) {
        console.error(`[Notification Settings Action] Error encrypting notification settings: ${(encError as Error).message}. File not saved.`);
        return { success: false, message: `Error encrypting notification settings: ${(encError as Error).message}. File not saved.` };
      }
    } else {
        console.log(`[Notification Settings Action] No encryption key found. Saving ${path.basename(notificationSettingsJsonPath)} as plaintext JSON.`);
    }

    await fs.writeFile(notificationSettingsJsonPath, contentToSave, 'utf-8');
    const saveMessage = `Successfully saved notification settings to ${path.basename(notificationSettingsJsonPath)} (${wasEncrypted ? 'encrypted' : 'plaintext'}).`;
    console.log(`[Notification Settings Action] ${saveMessage}`);
    return { success: true, message: saveMessage };
  } catch (error) {
    console.error(`[Notification Settings Action] Error saving notification settings: ${(error as Error).message}`);
    return { success: false, message: `Error saving notification settings: ${(error as Error).message}` };
  }
}
