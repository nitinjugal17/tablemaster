
'use server';

import fs from 'fs/promises';
import path from 'path';
import type { Theme, ThemeColorPalette } from '@/lib/types';

const globalsCssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');

// Helper function to replace HSL values for a given CSS variable in a block
function replaceCssVariable(cssBlock: string, variableName: string, newHslValue: string): string {
  // Regex to find: --variable-name: H S% L%;
  // It captures the variable name and its HSL value.
  // HSL value can be digits, percentages, and spaces.
  const regex = new RegExp(`(${variableName}:\\s*)([^;]+)(;)`);
  if (regex.test(cssBlock)) {
    return cssBlock.replace(regex, `$1${newHslValue}$3`);
  }
  console.warn(`[Theme Action] CSS variable ${variableName} not found in block to replace.`);
  return cssBlock; // Return original block if variable not found
}

export async function applyThemeToGlobalsCss(theme: Theme): Promise<{ success: boolean; message: string }> {
  console.log(`[Theme Action] Applying theme "${theme.name}" to globals.css`);
  try {
    let cssContent = await fs.readFile(globalsCssPath, 'utf-8');

    // Apply light theme colors to :root
    let rootBlockMatch = cssContent.match(/:root\s*{([^}]+)}/);
    if (rootBlockMatch && rootBlockMatch[1]) {
      let rootCss = rootBlockMatch[1];
      for (const [key, value] of Object.entries(theme.lightColors)) {
        const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`; // Convert camelCase to kebab-case
        rootCss = replaceCssVariable(rootCss, cssVarName, value);
      }
      cssContent = cssContent.replace(/:root\s*{([^}]+)}/, `:root {${rootCss}}`);
    } else {
      console.warn("[Theme Action] :root block not found in globals.css");
    }

    // Apply dark theme colors to .dark
    let darkBlockMatch = cssContent.match(/\.dark\s*{([^}]+)}/);
    if (darkBlockMatch && darkBlockMatch[1]) {
      let darkCss = darkBlockMatch[1];
      for (const [key, value] of Object.entries(theme.darkColors)) {
        const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        darkCss = replaceCssVariable(darkCss, cssVarName, value);
      }
      cssContent = cssContent.replace(/\.dark\s*{([^}]+)}/, `.dark {${darkCss}}`);
    } else {
      console.warn("[Theme Action] .dark block not found in globals.css");
    }

    await fs.writeFile(globalsCssPath, cssContent, 'utf-8');
    console.log(`[Theme Action] Successfully updated globals.css with theme "${theme.name}".`);
    return { success: true, message: `Theme "${theme.name}" applied successfully. Refresh your browser to see changes.` };

  } catch (error) {
    console.error(`[Theme Action] Error applying theme to globals.css:`, (error as Error).message);
    return { success: false, message: `Error applying theme: ${(error as Error).message}` };
  }
}
