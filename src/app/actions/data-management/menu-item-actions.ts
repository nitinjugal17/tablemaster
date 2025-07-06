
'use server';
import path from 'path';
import Papa from 'papaparse';
import { dataDir, readCsvFile, overwriteCsvFile } from './_csv-base-actions';
import { MENU_ITEMS_HEADERS } from './_csv-headers';
import type { MenuItem, StockItem, StockMenuMapping, StockUnit, MenuItemPortion } from '@/lib/types';
import { getStockItems } from './stock-item-actions';
import { getStockMenuMappings } from './stock-menu-mapping-actions';

// Helper for simplified unit conversion for costing
function getEffectivePricePerMappingUnit(
  purchasePrice: number, // Price per stockUnit
  stockUnit: StockUnit,
  mappingUnit: StockUnit
): number {
  if (stockUnit === mappingUnit) return purchasePrice;

  if (stockUnit === 'kg' && mappingUnit === 'g') return purchasePrice / 1000;
  if (stockUnit === 'g' && mappingUnit === 'kg') return purchasePrice * 1000;

  if (stockUnit === 'liter' && mappingUnit === 'ml') return purchasePrice / 1000;
  if (stockUnit === 'ml' && mappingUnit === 'liter') return purchasePrice * 1000;
  
  console.warn(`[CostCalc] Unhandled unit conversion from stock unit '${stockUnit}' to mapping unit '${mappingUnit}'. Assuming purchase price applies directly to mapping unit count.`);
  return purchasePrice; // Fallback
}


export async function getMenuItems(): Promise<MenuItem[]> {
  const rawData = await readCsvFile<any>(menuItemsCsvPath, MENU_ITEMS_HEADERS);
  return rawData.map(item => {
    let parsedPortionDetails: MenuItemPortion[] = [];
    if (typeof item.portionDetails === 'string' && item.portionDetails.trim() !== "") {
        try {
            parsedPortionDetails = JSON.parse(item.portionDetails);
            if (!Array.isArray(parsedPortionDetails) || parsedPortionDetails.some(p => typeof p.name !== 'string' || typeof p.price !== 'number')) {
                parsedPortionDetails = [{ name: "fixed", price: parseFloat(String(item.price_fallback_for_parsing_error)) || 0, isDefault: true }]; // Fallback for malformed
            }
        } catch (e) {
            console.warn(`Could not parse portionDetails for item ${item.id}: ${item.portionDetails}. Falling back.`);
            parsedPortionDetails = [{ name: "fixed", price: parseFloat(String(item.price_fallback_for_parsing_error)) || 0, isDefault: true }];
        }
    } else if (Array.isArray(item.portionDetails)) { // If it's already an array (e.g. direct object from some other source)
        parsedPortionDetails = item.portionDetails.map((p: any) => ({
            name: String(p.name || "fixed"),
            price: Number(p.price) || 0,
            isDefault: p.isDefault === true || String(p.isDefault).toLowerCase() === 'true',
        }));
    }

    if (parsedPortionDetails.length === 0) {
        parsedPortionDetails.push({ name: "fixed", price: 0, isDefault: true });
    }
    // Ensure at least one portion is default if none are marked
    if (!parsedPortionDetails.some(p => p.isDefault)) {
        parsedPortionDetails[0].isDefault = true;
    }


    return {
      id: String(item.id || crypto.randomUUID()), 
      name: item.name || "Unnamed Item",
      description: item.description || "",
      portionDetails: parsedPortionDetails,
      category: item.category || "Uncategorized",
      imageUrl: item.imageUrl && String(item.imageUrl).trim() !== "" ? String(item.imageUrl) : `https://placehold.co/600x400.png?text=${encodeURIComponent(item.name || 'Item')}`,
      cuisine: item.cuisine || "",
      ingredients: item.ingredients || "",
      dietaryRestrictions: item.dietaryRestrictions || "",
      recipe: item.recipe || "",
      preparationMethod: item.preparationMethod || "",
      aiHint: item.aiHint || (item.name ? item.name.toLowerCase().split(' ').slice(0,2).join(' ') : ''),
      synonyms: item.synonyms || "",
      isAvailable: String(item.isAvailable).toLowerCase() === 'true',
      isSignatureDish: String(item.isSignatureDish).toLowerCase() === 'true',
      isTodaysSpecial: String(item.isTodaysSpecial).toLowerCase() === 'true',
      calculatedCost: item.calculatedCost !== undefined && String(item.calculatedCost).trim() !== "" ? parseFloat(String(item.calculatedCost)) : undefined,
      calories: item.calories !== undefined && String(item.calories).trim() !== "" ? Number(item.calories) : undefined,
      carbs: item.carbs !== undefined && String(item.carbs).trim() !== "" ? Number(item.carbs) : undefined,
      protein: item.protein !== undefined && String(item.protein).trim() !== "" ? Number(item.protein) : undefined,
      fat: item.fat !== undefined && String(item.fat).trim() !== "" ? Number(item.fat) : undefined,
      energyKJ: item.energyKJ !== undefined && String(item.energyKJ).trim() !== "" ? Number(item.energyKJ) : undefined,
      servingSizeSuggestion: item.servingSizeSuggestion || undefined,
    };
  });
}

const menuItemsCsvPath = path.join(dataDir, 'menu-items.csv');

export async function saveMenuItemChanges(
    { upserts, deletes }: { upserts: MenuItem[]; deletes: string[] }
): Promise<{ success: boolean; message: string; count?: number }> {
    console.log('[Menu Item Action] Attempting to save granular menu item changes to CSV.');
    try {
        const existingMenuItems = await getMenuItems();
        const allStockItems = await getStockItems();
        const allStockMenuMappings = await getStockMenuMappings();
        
        const finalItemsMap = new Map(existingMenuItems.map(item => [item.id, item]));

        for (const idToDelete of deletes) {
            finalItemsMap.delete(idToDelete);
        }

        for (const itemToUpsert of upserts) {
            let calculatedCost = 0;
            const itemMappings = allStockMenuMappings.filter(m => m.menuItemId === itemToUpsert.id);

            // Cost calculation should ideally be for the default portion or a representative one
            // For now, it remains a general cost; per-portion costing is more complex
            if (itemMappings.length > 0) {
                for (const mapping of itemMappings) {
                    const stockItem = allStockItems.find(si => si.id === mapping.stockItemId);
                    if (stockItem) {
                        const effectivePrice = getEffectivePricePerMappingUnit(stockItem.purchasePrice, stockItem.unit, mapping.unitUsed);
                        calculatedCost += mapping.quantityUsedPerServing * effectivePrice;
                    } else {
                        console.warn(`[CostCalc] Stock item ${mapping.stockItemId} not found for menu item ${itemToUpsert.id}. Cannot calculate its cost contribution.`);
                    }
                }
            }
            itemToUpsert.calculatedCost = calculatedCost > 0 ? parseFloat(calculatedCost.toFixed(2)) : undefined;
            
            // Ensure portionDetails is valid
            if (!itemToUpsert.portionDetails || itemToUpsert.portionDetails.length === 0) {
                itemToUpsert.portionDetails = [{ name: "fixed", price: 0, isDefault: true }];
            }
            // Ensure at least one portion is default
            if (!itemToUpsert.portionDetails.some(p => p.isDefault)) {
                itemToUpsert.portionDetails[0].isDefault = true;
            }


            finalItemsMap.set(itemToUpsert.id, itemToUpsert);
        }
        
        const finalItemsArray = Array.from(finalItemsMap.values());
        
        const dataForCsv = finalItemsArray.map(item => ({
            id: String(item.id || crypto.randomUUID()),
            name: item.name || 'Unnamed Item',
            description: item.description || '',
            // price field removed from CSV
            category: item.category || 'Uncategorized',
            imageUrl: item.imageUrl && String(item.imageUrl).trim() !== "" ? String(item.imageUrl) : `https://placehold.co/600x400.png?text=${encodeURIComponent(item.name || 'Item')}`,
            cuisine: item.cuisine || '',
            ingredients: item.ingredients || '',
            dietaryRestrictions: item.dietaryRestrictions || '',
            recipe: item.recipe || '',
            preparationMethod: item.preparationMethod || '',
            aiHint: item.aiHint || (item.name ? item.name.toLowerCase().split(' ').slice(0,2).join(' ') : ''),
            synonyms: item.synonyms || '',
            isAvailable: String(item.isAvailable === undefined ? true : item.isAvailable),
            isSignatureDish: String(item.isSignatureDish || false),
            isTodaysSpecial: String(item.isTodaysSpecial || false),
            portionDetails: JSON.stringify(item.portionDetails || [{ name: "fixed", price: 0, isDefault: true }]),
            calculatedCost: item.calculatedCost !== undefined ? item.calculatedCost : '',
            calories: item.calories !== undefined ? item.calories : '',
            carbs: item.carbs !== undefined ? item.carbs : '',
            protein: item.protein !== undefined ? item.protein : '',
            fat: item.fat !== undefined ? item.fat : '',
            energyKJ: item.energyKJ !== undefined ? item.energyKJ : '',
            servingSizeSuggestion: item.servingSizeSuggestion || '',
        }));
        
        const csvHeaders = MENU_ITEMS_HEADERS.trim().split(',');
        return overwriteCsvFile(menuItemsCsvPath, dataForCsv, csvHeaders);

    } catch (error) {
        console.error(`[Menu Item Action] Error processing/saving menu item changes: ${(error as Error).message}`);
        return { success: false, message: `Error processing/saving menu item changes: ${(error as Error).message}` };
    }
}

export async function downloadMenuItemsCsv(): Promise<string> {
  try {
    const items = await getMenuItems(); 
    if (items.length === 0) return MENU_ITEMS_HEADERS; 
    const dataForCsv = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      // price field removed
      category: item.category,
      imageUrl: item.imageUrl && String(item.imageUrl).trim() !== "" ? String(item.imageUrl) : `https://placehold.co/600x400.png?text=${encodeURIComponent(item.name || 'Item')}`,
      cuisine: item.cuisine,
      ingredients: item.ingredients,
      dietaryRestrictions: item.dietaryRestrictions,
      recipe: item.recipe,
      preparationMethod: item.preparationMethod,
      aiHint: item.aiHint,
      synonyms: item.synonyms,
      isAvailable: String(item.isAvailable),
      isSignatureDish: String(item.isSignatureDish || false),
      isTodaysSpecial: String(item.isTodaysSpecial || false),
      portionDetails: JSON.stringify(item.portionDetails || [{ name: "fixed", price: 0, isDefault: true }]),
      calculatedCost: item.calculatedCost !== undefined ? item.calculatedCost : '',
      calories: item.calories !== undefined ? item.calories : '',
      carbs: item.carbs !== undefined ? item.carbs : '',
      protein: item.protein !== undefined ? item.protein : '',
      fat: item.fat !== undefined ? item.fat : '',
      energyKJ: item.energyKJ !== undefined ? item.energyKJ : '',
      servingSizeSuggestion: item.servingSizeSuggestion || '',
    }));
    const csvHeaders = MENU_ITEMS_HEADERS.trim().split(',');
    return Papa.unparse(dataForCsv, { header: true, columns: csvHeaders });
  } catch (error) {
    console.error(`[Menu Item Action] Error generating MenuItems CSV for download: ${(error as Error).message}`);
    return MENU_ITEMS_HEADERS; 
  }
}

export async function uploadMenuItemsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
   try {
    const parsedForValidation = Papa.parse<any>(csvString, {
      header: true,
      dynamicTyping: false, 
      skipEmptyLines: true,
    });

    if (parsedForValidation.errors.length > 0) {
      const errorMessages = parsedForValidation.errors.map(e => `Row ${(e.row !== undefined ? e.row + 1 : 'N/A')}: ${e.message} (${e.code})`).join('; ');
      return { success: false, message: `CSV parsing errors: ${errorMessages}. File not saved.` };
    }
    
    const itemsToSave: MenuItem[] = parsedForValidation.data.map((item, index) => {
        let parsedPortionDetails: MenuItemPortion[] = [];
        if (typeof item.portionDetails === 'string' && item.portionDetails.trim() !== "") {
            try {
                parsedPortionDetails = JSON.parse(item.portionDetails);
                 if (!Array.isArray(parsedPortionDetails) || parsedPortionDetails.some(p => typeof p.name !== 'string' || typeof p.price !== 'number')) {
                    parsedPortionDetails = [{ name: "fixed", price: 0, isDefault: true }];
                }
            } catch (e) {
                 parsedPortionDetails = [{ name: "fixed", price: 0, isDefault: true }];
            }
        }
        if (parsedPortionDetails.length === 0) {
            parsedPortionDetails.push({ name: "fixed", price: 0, isDefault: true });
        }
        if (!parsedPortionDetails.some(p => p.isDefault)) {
            parsedPortionDetails[0].isDefault = true;
        }

        return {
            id: String(item.id || crypto.randomUUID()),
            name: item.name || `Unnamed Item ${index + 1}`,
            description: item.description || '',
            portionDetails: parsedPortionDetails,
            category: item.category || 'Uncategorized',
            imageUrl: item.imageUrl && String(item.imageUrl).trim() !== "" ? String(item.imageUrl) : `https://placehold.co/600x400.png?text=${encodeURIComponent(item.name || `Item ${index+1}`)}`,
            cuisine: item.cuisine || '',
            ingredients: item.ingredients || '',
            dietaryRestrictions: item.dietaryRestrictions || '',
            recipe: item.recipe || '',
            preparationMethod: item.preparationMethod || '',
            aiHint: item.aiHint || (item.name ? item.name.toLowerCase().split(' ').slice(0,2).join(' ') : ''),
            synonyms: item.synonyms || '',
            isAvailable: String(item.isAvailable).toLowerCase() === 'true',
            isSignatureDish: String(item.isSignatureDish).toLowerCase() === 'true',
            isTodaysSpecial: String(item.isTodaysSpecial).toLowerCase() === 'true',
            calculatedCost: item.calculatedCost !== undefined && String(item.calculatedCost).trim() !== "" ? parseFloat(String(item.calculatedCost)) : undefined,
            calories: item.calories !== undefined && String(item.calories).trim() !== "" ? Number(item.calories) : undefined,
            carbs: item.carbs !== undefined && String(item.carbs).trim() !== "" ? Number(item.carbs) : undefined,
            protein: item.protein !== undefined && String(item.protein).trim() !== "" ? Number(item.protein) : undefined,
            fat: item.fat !== undefined && String(item.fat).trim() !== "" ? Number(item.fat) : undefined,
            energyKJ: item.energyKJ !== undefined && String(item.energyKJ).trim() !== "" ? Number(item.energyKJ) : undefined,
            servingSizeSuggestion: item.servingSizeSuggestion || undefined,
        };
    });

    // Call saveMenuItemChanges which handles recalculating costs and then saving to CSV
    return saveMenuItemChanges({ upserts: itemsToSave, deletes: [] });

  } catch (error) {
    console.error(`[Menu Item Action] Error processing MenuItems CSV upload: ${(error as Error).message}`);
    return { success: false, message: `Error processing CSV: ${(error as Error).message}` };
  }
}
