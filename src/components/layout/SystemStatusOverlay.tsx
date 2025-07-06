
"use client";

import { useState, useEffect } from 'react';
import { checkSystemReady } from '@/app/actions/data-management-actions';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function SystemStatusOverlay() {
  const [isSystemReady, setIsSystemReady] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      const { isReady, message } = await checkSystemReady();
      setIsSystemReady(isReady);
      setErrorMessage(message || 'An unknown system error occurred.');
      setIsLoading(false);
    }
    // Only run this check on the client-side
    if (typeof window !== 'undefined') {
        checkStatus();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSystemReady) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-6" />
        <h1 className="text-3xl font-headline font-bold text-destructive mb-4">Website Configuration Error</h1>
        <p className="text-lg text-foreground/80 mb-2">The application is not configured correctly and cannot start.</p>
        <p className="text-md text-muted-foreground mb-6">
          <strong>Details:</strong> {errorMessage}
        </p>
        <p className="text-sm text-muted-foreground">
          Please contact the site administrator to resolve this issue. If you are the administrator, please refer to the server logs and the developer guide for instructions on how to set up the initial user.
        </p>
      </div>
    </div>
  );
}
