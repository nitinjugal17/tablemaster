
"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This is a redirect component.
// It redirects users from /admin/marketing to /admin/marketing/offers by default.
export default function MarketingRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/marketing/offers');
  }, [router]);

  return null; // Render nothing, the redirect will happen
}
