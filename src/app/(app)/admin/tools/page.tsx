
"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This is a redirect component.
// It redirects users from /admin/tools to /admin/tools/id-card-generator by default.
export default function ToolsRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/tools/id-card-generator');
  }, [router]);

  return null; // Render nothing, the redirect will happen
}
