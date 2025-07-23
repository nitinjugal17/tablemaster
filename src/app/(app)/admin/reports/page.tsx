"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This is a redirect component.
// It redirects users from /admin/reports to /admin/reports/sales by default.
export default function ReportsRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/reports/sales');
  }, [router]);

  return null; // Render nothing, the redirect will happen
}
