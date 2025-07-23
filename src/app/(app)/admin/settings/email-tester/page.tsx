// src/app/(app)/admin/settings/email-tester/page.tsx
'use server';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { EmailTesterClient } from '@/components/admin/tools/EmailTesterClient';
import { getGeneralSettings } from '@/app/actions/data-management-actions';

export default async function EmailTesterPage() {
    const settings = await getGeneralSettings();
    const adminEmail = settings.footerContactEmail || process.env.NEXT_PUBLIC_ADMIN_EMAIL_NOTIFICATIONS || "admin@example.com";
    
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Loading Email Tester...</p>
            </div>
        }>
            <EmailTesterClient adminEmail={adminEmail} />
        </Suspense>
    );
}
