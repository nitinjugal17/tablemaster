
// src/app/(app)/admin/reports/feedback/page.tsx
'use server';
import { getFeedback, getFeedbackCategories, getActiveDataSourceStatus } from '@/app/actions/data-management-actions';
import { FeedbackReportClient } from '@/components/admin/reports/FeedbackReportClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';


export default async function FeedbackReportPage() {
  const [feedbackData, categoriesData, dataSourceStatus] = await Promise.all([
    getFeedback(),
    getFeedbackCategories(),
    getActiveDataSourceStatus(),
  ]);

  return (
    <div className="space-y-4">
       {dataSourceStatus.isFallback && (
        <Alert variant="default" className="bg-amber-50 border-amber-400">
          <Info className="h-5 w-5 text-amber-600" />
          <AlertTitle className="font-semibold text-amber-700">Database Unreachable</AlertTitle>
          <AlertDescription className="text-amber-600">
            {dataSourceStatus.message} Displaying data from local CSV files as a fallback.
          </AlertDescription>
        </Alert>
      )}
      <FeedbackReportClient initialFeedback={feedbackData} initialCategories={categoriesData} />
    </div>
  );
}

    