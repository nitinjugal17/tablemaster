'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { FeedbackCategory } from '@/lib/types';
import { defaultFeedbackCategories } from '@/lib/types';

export async function getFeedbackCategories(): Promise<FeedbackCategory[]> {
  const { db } = await connectToDatabase();
  const categories = await db.collection('feedback-categories').find({}).toArray();
  if (categories.length === 0) {
    await saveFeedbackCategories(defaultFeedbackCategories);
    return defaultFeedbackCategories;
  }
  return categories.map(fromMongo) as FeedbackCategory[];
}

export async function saveFeedbackCategories(categories: FeedbackCategory[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('feedback-categories').deleteMany({});
        if (categories.length > 0) {
            const categoriesWithObjectIds = categories.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
            }));
            const result = await db.collection('feedback-categories').insertMany(categoriesWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} feedback categories.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all feedback categories.', count: 0 };
    } catch (error) {
        console.error("Error saving feedback categories to MongoDB:", error);
        return { success: false, message: `Error saving feedback categories to MongoDB: ${(error as Error).message}` };
    }
}
