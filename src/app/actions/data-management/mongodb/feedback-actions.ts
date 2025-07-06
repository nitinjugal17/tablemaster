'use server';
import { connectToDatabase, fromMongo, toObjectId } from '@/lib/mongodb';
import type { Feedback } from '@/lib/types';

export async function getFeedback(): Promise<Feedback[]> {
  const { db } = await connectToDatabase();
  const feedback = await db.collection('feedback').find({}).toArray();
  return feedback.map(fromMongo) as Feedback[];
}

export async function saveFeedback(feedbackList: Feedback[]): Promise<{ success: boolean; message: string; count?: number }> {
    const { db } = await connectToDatabase();
    try {
        await db.collection('feedback').deleteMany({});
        if (feedbackList.length > 0) {
            const feedbackWithObjectIds = feedbackList.map(({ id, ...rest }) => ({
                ...rest,
                _id: toObjectId(id),
                createdAt: new Date(rest.createdAt),
            }));
            const result = await db.collection('feedback').insertMany(feedbackWithObjectIds as any);
            return { success: true, message: `Successfully saved ${result.insertedCount} feedback entries.`, count: result.insertedCount };
        }
        return { success: true, message: 'Successfully cleared all feedback.', count: 0 };
    } catch (error) {
        console.error("Error saving feedback to MongoDB:", error);
        return { success: false, message: `Error saving feedback to MongoDB: ${(error as Error).message}` };
    }
}
