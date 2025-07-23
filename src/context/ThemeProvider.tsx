
"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useGeneralSettings } from './GeneralSettingsContext';
import type { Theme } from '@/lib/types';

interface ThemeProviderProps {
  children: React.ReactNode;
}

const ThemeContext = createContext<undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { settings, isLoadingSettings } = useGeneralSettings();

  useEffect(() => {
    if (isLoadingSettings) return;

    try {
      const allThemes: Theme[] = settings.availableThemes
        ? JSON.parse(settings.availableThemes)
        : [];
      const activeThemeId = settings.activeThemeId;
      const activeTheme = allThemes.find(t => t.id === activeThemeId);

      if (activeTheme) {
        const root = window.document.documentElement;
        
        // Remove old theme class and add new one
        root.classList.remove('light', 'dark'); // Clear existing mode classes
        root.classList.add('light'); // Apply light mode by default

        // Apply light theme colors
        for (const [key, value] of Object.entries(activeTheme.lightColors)) {
          const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          root.style.setProperty(cssVarName, value);
        }
        
        // Apply dark theme colors under the .dark selector (handled by globals.css now)
        const darkStyle = document.createElement('style');
        darkStyle.innerHTML = `
          .dark {
            ${Object.entries(activeTheme.darkColors).map(([key, value]) => {
              const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
              return `${cssVarName}: ${value};`;
            }).join('\n')}
          }
        `;
        document.head.appendChild(darkStyle);
        
        // Clean up style tag on component unmount or theme change
        return () => {
          document.head.removeChild(darkStyle);
        };
      }
    } catch (e) {
      console.error("Failed to parse or apply theme from settings:", e);
    }
  }, [settings, isLoadingSettings]);

  return (
    <ThemeContext.Provider value={undefined}>
      {children}
    </ThemeContext.Provider>
  );
};
