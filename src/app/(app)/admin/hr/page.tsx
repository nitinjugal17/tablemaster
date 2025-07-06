
"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This is a redirect component.
// It redirects users from /admin/hr to /admin/hr/attendance by default.
export default function HRRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/hr/attendance');
  }, [router]);

  return null; // Render nothing, the redirect will happen
}
