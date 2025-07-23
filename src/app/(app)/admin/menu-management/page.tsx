
"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This is a redirect component.
// It redirects users from /admin/menu-management to /admin/menu-management/items by default.
export default function MenuManagementRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/menu-management/items');
  }, [router]);

  return null; // Render nothing, the redirect will happen
}
