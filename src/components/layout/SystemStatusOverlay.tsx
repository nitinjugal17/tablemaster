
"use client";

import { useState, useEffect } from 'react';
import { getDbConnectionStatus } from '@/app/actions/data-management-actions';
import { AlertTriangle, Loader2, WifiOff } from 'lucide-react';

export default function SystemStatusOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      const isMongoConfigured = process.env.NEXT_PUBLIC_DATA_SOURCE === 'mongodb';
      if (!isMongoConfigured) {
        setIsLoading(false);
        return; // Don't show overlay if we are not even trying to use Mongo
      }

      const { isConnected, message } = await getDbConnectionStatus();
      
      if (!isConnected) {
        setShowOverlay(true);
        setErrorMessage(message || 'The application could not connect to the MongoDB database.');
      }
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

  if (!showOverlay) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl">
        <WifiOff className="mx-auto h-16 w-16 text-destructive mb-6" />
        <h1 className="text-3xl font-headline font-bold text-destructive mb-4">Database Connection Failed</h1>
        <p className="text-lg text-foreground/80 mb-2">
            The application is currently running in offline/fallback mode using local CSV data.
        </p>
        <p className="text-md text-muted-foreground mb-6">
          <strong>Details:</strong> {errorMessage}
        </p>
        <p className="text-sm text-muted-foreground">
          This usually happens when `DATA_SOURCE` is set to `mongodb` in your `.env` file, but the application cannot connect to the database. 
          Please ensure your MongoDB server is running and the `MONGODB_URI` is correct. Some features may be limited in fallback mode.
        </p>
      </div>
    </div>
  );
}
