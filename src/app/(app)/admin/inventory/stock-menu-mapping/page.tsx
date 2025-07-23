
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is now obsolete and redirects to the main inventory page.
// The mapping functionality has been integrated directly into the MenuItemEditor.
export default function ObsoleteStockMenuMappingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/inventory');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h1 className="text-xl font-semibold text-muted-foreground">Redirecting...</h1>
      <p className="text-muted-foreground">
        Stock-to-Menu mapping is now handled directly inside the Menu Item Editor.
      </p>
      <p className="text-muted-foreground">You are being redirected to the Inventory page.</p>
    </div>
  );
}
