// src/app/actions/data-management/mongodb/menu-item-actions.ts
'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { MenuItem, MenuItemPortion } from '@/lib/types';
import Papa from 'papaparse';
import { MENU_ITEMS_HEADERS } from '../_csv-headers';

export async function getMenuItems(): Promise<MenuItem[]> {
  const { db } = await connectToDatabase();
  const menuItems = await db.collection('menu-items').find({}).toArray();
  return menuItems.map(fromMongo) as MenuItem[];
}

export async function saveMenuItemChanges({ upserts, deletes }: { upserts: MenuItem[]; deletes: string[] }): Promise<{ success: boolean; message: string; count?: number }> {
  const { db } = await connectToDatabase();
  const collection = db.collection('menu-items');
  let upsertedCount = 0;
  let deletedCount = 0;

  try {
    if (deletes.length > 0) {
      const deleteResult = await collection.deleteMany({ _id: { $in: deletes.map(toObjectId) } });
      deletedCount = deleteResult.deletedCount;
    }

    if (upserts.length > 0) {
      const bulkOps = upserts.map(item => {
        const { id, ...rest } = item;
        return {
          updateOne: {
            filter: { _id: toObjectId(id) },
            update: { $set: rest },
            upsert: true,
          }
        };
      });
      const bulkResult = await collection.bulkWrite(bulkOps);
      upsertedCount = bulkResult.upsertedCount + bulkResult.modifiedCount;
    }

    return { success: true, message: `Successfully saved menu items. Upserted: ${upsertedCount}, Deleted: ${deletedCount}.`, count: upsertedCount + deletedCount };
  } catch (error) {
    console.error("Error in saveMenuItemChanges (MongoDB):", error);
    return { success: false, message: `Error saving menu items: ${(error as Error).message}` };
  }
}

export async function downloadMenuItemsCsv(): Promise<string> {
    const items = await getMenuItems();
    if (items.length === 0) return MENU_ITEMS_HEADERS; 
    const dataForCsv = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      imageUrl: item.imageUrl,
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
      isMinibarItem: String(item.isMinibarItem || false),
      portionDetails: JSON.stringify(item.portionDetails || []),
      calculatedCost: item.calculatedCost !== undefined ? item.calculatedCost : '',
      calories: item.calories !== undefined ? item.calories : '',
      carbs: item.carbs !== undefined ? item.carbs : '',
      protein: item.protein !== undefined ? item.protein : '',
      fat: item.fat !== undefined ? item.fat : '',
      energyKJ: item.energyKJ !== undefined ? item.energyKJ : '',
      servingSizeSuggestion: item.servingSizeSuggestion || '',
      addonGroups: item.addonGroups ? item.addonGroups.join(',') : '',
    }));
    return Papa.unparse(dataForCsv, { header: true, columns: MENU_ITEMS_HEADERS.trim().split(',') });
}

export async function uploadMenuItemsCsv(csvString: string): Promise<{ success: boolean; message: string; count?: number }> {
    const parsed = Papa.parse<any>(csvString, { header: true, dynamicTyping: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      return { success: false, message: `CSV parsing errors: ${parsed.errors.map(e => e.message).join('; ')}` };
    }
    const itemsToUpsert: MenuItem[] = parsed.data.map((item: any, index: number) => {
      let parsedPortionDetails: MenuItemPortion[] = [];
      if (typeof item.portionDetails === 'string' && item.portionDetails.trim()) {
          try {
              parsedPortionDetails = JSON.parse(item.portionDetails);
              if (!Array.isArray(parsedPortionDetails)) parsedPortionDetails = [];
          } catch(e) {
              throw new Error(`Row ${index + 2}: Invalid JSON in 'portionDetails' field for item '${item.name}'.`);
          }
      } else if (Array.isArray(item.portionDetails)) {
          parsedPortionDetails = item.portionDetails;
      }
      
      return {
        id: item.id || crypto.randomUUID(), // Assuming new items might not have an ID
        name: item.name,
        description: item.description,
        portionDetails: parsedPortionDetails,
        category: item.category,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable === 'true',
        isSignatureDish: item.isSignatureDish === 'true',
        isTodaysSpecial: item.isTodaysSpecial === 'true',
        isMinibarItem: item.isMinibarItem === 'true',
        addonGroups: typeof item.addonGroups === 'string' ? item.addonGroups.split(',').map((id:string) => id.trim()).filter(Boolean) : [],
        cuisine: item.cuisine,
        ingredients: item.ingredients,
        dietaryRestrictions: item.dietaryRestrictions,
        recipe: item.recipe,
        preparationMethod: item.preparationMethod,
        synonyms: item.synonyms,
        aiHint: item.aiHint,
        calculatedCost: item.calculatedCost ? parseFloat(item.calculatedCost) : undefined,
        calories: item.calories ? parseInt(item.calories, 10) : undefined,
        carbs: item.carbs ? parseInt(item.carbs, 10) : undefined,
        protein: item.protein ? parseInt(item.protein, 10) : undefined,
        fat: item.fat ? parseInt(item.fat, 10) : undefined,
        energyKJ: item.energyKJ ? parseInt(item.energyKJ, 10) : undefined,
        servingSizeSuggestion: item.servingSizeSuggestion,
      }
    });

    const { db } = await connectToDatabase();
    await db.collection('menu-items').deleteMany({}); // Clear existing before upload

    return saveMenuItemChanges({ upserts: itemsToUpsert, deletes: [] });
}
