'use server';
import path from 'path';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { FEEDBACK_CATEGORIES_HEADERS } from '../_csv-headers';
import type { FeedbackCategory } from '@/lib/types';
import { defaultFeedbackCategories } from '@/lib/types';

const feedbackCategoriesCsvPath = path.join(dataDir, 'feedback-categories.csv');

export async function getFeedbackCategories(): Promise<FeedbackCategory[]> {
  try {
    const rawData = await readCsvFile<any>(feedbackCategoriesCsvPath, FEEDBACK_CATEGORIES_HEADERS);
    if (rawData.length === 0) {
      console.warn('[Feedback Category Action] feedback-categories.csv is empty or not found. Initializing with default categories.');
      await saveFeedbackCategories(defaultFeedbackCategories);
      return defaultFeedbackCategories;
    }
    return rawData.map(category => ({
      id: String(category.id || crypto.randomUUID()),
      name: category.name || 'Unnamed Category',
      description: category.description || '',
    }));
  } catch (error) {
    console.error(`[Feedback Category Action] Error reading feedback categories, returning defaults: ${(error as Error).message}`);
    return defaultFeedbackCategories;
  }
}

export async function saveFeedbackCategories(categories: FeedbackCategory[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = categories.map(cat => ({ ...cat }));
  const csvHeaders = FEEDBACK_CATEGORIES_HEADERS.trim().split(',');
  return overwriteCsvFile(feedbackCategoriesCsvPath, dataForCsv, csvHeaders);
}
