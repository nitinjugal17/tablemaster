// src/app/(app)/admin/tools/id-card-generator/page.tsx
'use server';
import { IdCardGeneratorClient } from '@/components/admin/tools/IdCardGeneratorClient';
import { getGeneralSettings } from '@/app/actions/data-management-actions';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default async function IdCardGeneratorPage() {
    const generalSettings = await getGeneralSettings();

    return (
        <Suspense fallback={
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Loading ID Card Generator...</p>
            </div>
        }>
            <IdCardGeneratorClient initialSettings={generalSettings} />
        </Suspense>
    );
}
