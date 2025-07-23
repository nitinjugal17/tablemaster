
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { InvoiceSetupSettings, MenuItemPortion } from "./types";
import { format, parse, set, addDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ShopStatus {
  isOpen: boolean;
  message: string;
  todaysHoursFormatted: string;
}

export function getShopOpenStatus(operatingHours?: InvoiceSetupSettings['operatingHours']): ShopStatus {
  if (!operatingHours) {
    return { isOpen: true, message: "Operating hours not configured. Assuming open.", todaysHoursFormatted: "Not set" };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes past midnight

  let openTimeStr: string | undefined;
  let closeTimeStr: string | undefined;
  let dayName = "";

  switch (currentDay) {
    case 0: // Sunday
      openTimeStr = operatingHours.sunOpen;
      closeTimeStr = operatingHours.sunClose;
      dayName = "Sunday";
      break;
    case 6: // Saturday
      openTimeStr = operatingHours.satOpen;
      closeTimeStr = operatingHours.satClose;
      dayName = "Saturday";
      break;
    default: // Monday to Friday
      openTimeStr = operatingHours.monFriOpen;
      closeTimeStr = operatingHours.monFriClose;
      dayName = format(now, "EEEE"); // Gets specific day name like "Monday"
  }

  const formatTime = (timeStr: string | undefined): string => {
    if (!timeStr) return "N/A";
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = set(new Date(), { hours, minutes });
      return format(date, "h:mm a");
    } catch {
      return "Invalid";
    }
  };
  
  const todaysHoursFormatted = (openTimeStr && closeTimeStr)
    ? `${formatTime(openTimeStr)} - ${formatTime(closeTimeStr)}`
    : "Closed today";

  if (!openTimeStr || !closeTimeStr) {
    return { isOpen: false, message: `We are closed on ${dayName}s.`, todaysHoursFormatted };
  }

  try {
    const [openHour, openMinute] = openTimeStr.split(':').map(Number);
    const [closeHour, closeMinute] = closeTimeStr.split(':').map(Number);

    const openTime = openHour * 60 + openMinute;
    let closeTime = closeHour * 60 + closeMinute;

    // Handle cases where closing time is past midnight (e.g., 23:00 - 02:00)
    // For restaurant simplicity, usually closing time is on the same day or just after midnight.
    // If closeTime is earlier than openTime, assume it's next day (e.g. closes at 2 AM)
    if (closeTime < openTime) { 
        // If current time is after open time OR before close time (next day)
        if (currentTime >= openTime || currentTime < closeTime) {
             return { isOpen: true, message: `Welcome! We're open until ${formatTime(closeTimeStr)}.`, todaysHoursFormatted };
        }
    } else {
         // Standard same-day closing
        if (currentTime >= openTime && currentTime < closeTime) {
            return { isOpen: true, message: `Welcome! We're open until ${formatTime(closeTimeStr)}.`, todaysHoursFormatted };
        }
    }

    // Determine next opening time
    let nextOpenDay = "";
    let nextOpenTimeStr = "";
    for (let i = 0; i < 7; i++) {
        const dayToCheck = (currentDay + i) % 7;
        let tempOpen: string | undefined, tempDayName: string;
         switch (dayToCheck) {
            case 0: tempOpen = operatingHours.sunOpen; tempDayName = "Sunday"; break;
            case 6: tempOpen = operatingHours.satOpen; tempDayName = "Saturday"; break;
            default: tempOpen = operatingHours.monFriOpen; tempDayName = (i === 0) ? "today" : format(addDays(now, i), "EEEE"); break;
        }
        if (tempOpen) {
            if (i === 0 && currentTime < (tempOpen.split(':').map(Number)[0] * 60 + tempOpen.split(':').map(Number)[1])) { // Still today but before opening
                nextOpenTimeStr = formatTime(tempOpen);
                nextOpenDay = "today";
                break;
            } else if (i > 0) { // Future day
                nextOpenTimeStr = formatTime(tempOpen);
                nextOpenDay = tempDayName;
                break;
            }
        }
    }
    
    const message = nextOpenDay && nextOpenTimeStr
        ? `We are currently closed. We will open ${nextOpenDay === 'today' ? '' : nextOpenDay + ' '}at ${nextOpenTimeStr}. Today's hours: ${todaysHoursFormatted}.`
        : `We are currently closed. Today's hours: ${todaysHoursFormatted}.`;

    return { isOpen: false, message, todaysHoursFormatted };

  } catch (e) {
    console.error("Error parsing operating hours:", e);
    return { isOpen: true, message: "Error determining shop status. Assuming open.", todaysHoursFormatted: "Error" }; // Fallback open on error
  }
}

/**
 * Safely parses the portionDetails field from a MenuItem, which might be a
 * JSON string or an array, into a consistent array of MenuItemPortion.
 * Returns an empty array if parsing fails or input is invalid.
 * @param portionDetails - The portionDetails field from a MenuItem.
 * @returns An array of MenuItemPortion.
 */
export function parsePortionDetails(portionDetails: any): MenuItemPortion[] {
    if (Array.isArray(portionDetails)) {
        // It's already an array, just return it.
        return portionDetails;
    }
    if (typeof portionDetails === 'string' && portionDetails.trim().startsWith('[')) {
        // It's a JSON string, try to parse it.
        try {
            const parsed = JSON.parse(portionDetails);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error("Failed to parse portionDetails string:", portionDetails, e);
            return []; // Return empty array on parsing error
        }
    }
    // If it's not an array or a JSON string of an array, return empty.
    return [];
}
