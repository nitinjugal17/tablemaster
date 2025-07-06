'use server';
import path from 'path';
import { dataDir, readCsvFile, overwriteCsvFile } from '../_csv-base-actions';
import { FEEDBACK_HEADERS } from '../_csv-headers';
import type { Feedback } from '@/lib/types';

const feedbackCsvPath = path.join(dataDir, 'feedback.csv');

export async function getFeedback(): Promise<Feedback[]> {
  const rawData = await readCsvFile<any>(feedbackCsvPath, FEEDBACK_HEADERS);
  return rawData.map(fb => ({
    id: String(fb.id || crypto.randomUUID()),
    rating: Number(fb.rating) || 0,
    category: fb.category || 'Other',
    comments: fb.comments || '',
    customerName: fb.customerName || undefined,
    contactInfo: fb.contactInfo || undefined,
    createdAt: fb.createdAt ? new Date(fb.createdAt).toISOString() : new Date().toISOString(),
    source: fb.source || undefined,
  }));
}

export async function saveFeedback(feedbackList: Feedback[]): Promise<{ success: boolean; message: string; count?: number }> {
  const dataForCsv = feedbackList.map(fb => ({ ...fb }));
  const csvHeaders = FEEDBACK_HEADERS.trim().split(',');
  return overwriteCsvFile(feedbackCsvPath, dataForCsv, csvHeaders);
}
