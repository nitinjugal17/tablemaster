
'use server';

import type { Theme } from '@/lib/types';
import { saveGeneralSettings } from './data-management-actions';
import { getGeneralSettings } from './data-management-actions';

// This file is obsolete for writing to CSS.
// Theme application is now handled client-side by ThemeProvider.
// This function remains for compatibility but no longer writes to globals.css.
export async function applyThemeToGlobalsCss(theme: Theme): Promise<{ success: boolean; message: string }> {
  console.log(`[Theme Action] Applying theme "${theme.name}" by saving it to settings.`);
  try {
    const generalSettings = await getGeneralSettings();
    
    const allThemes: Theme[] = generalSettings.availableThemes ? JSON.parse(generalSettings.availableThemes) : [];
    const themeIndex = allThemes.findIndex(t => t.id === theme.id);

    if (themeIndex > -1) {
      allThemes[themeIndex] = theme;
    } else {
      allThemes.push(theme);
    }

    const updatedSettings = {
      ...generalSettings,
      activeThemeId: theme.id,
      availableThemes: JSON.stringify(allThemes),
    };

    const result = await saveGeneralSettings(updatedSettings);

    if (result.success) {
      return { success: true, message: `Theme "${theme.name}" settings saved. It will be applied globally.` };
    } else {
      return { success: false, message: `Failed to save theme settings: ${result.message}` };
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[Theme Action] Error saving theme:`, errorMessage);
    return { success: false, message: `Error saving theme: ${errorMessage}` };
  }
}
