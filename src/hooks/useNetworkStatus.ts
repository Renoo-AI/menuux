'use client';

import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isDatabaseConnected: boolean;
  lastChecked: Date | null;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isDatabaseConnected: true,
    lastChecked: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true, lastChecked: new Date() }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false, lastChecked: new Date() }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

// Retry helper for Database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a retryable error
      const dbError = error as { code?: string; message?: string; status?: number };
      const isRetryable = 
        dbError.code === 'unavailable' ||
        dbError.code === 'deadline-exceeded' ||
        dbError.code === 'resource-exhausted' ||
        dbError.status === 503 ||
        dbError.status === 504 ||
        dbError.message?.toLowerCase().includes('timeout') ||
        dbError.message?.toLowerCase().includes('offline') ||
        dbError.message?.toLowerCase().includes('network') ||
        (error as Error).message?.includes('offline');
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
}

// Check if error is an offline error
export function isOfflineError(error: unknown): boolean {
  if (!error) return false;
  
  const dbError = error as { code?: string; message?: string };
  
  return (
    dbError.code === 'unavailable' ||
    dbError.code === 'failed-precondition' ||
    dbError.message?.toLowerCase().includes('offline') ||
    dbError.message?.toLowerCase().includes('network') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  );
}

export default useNetworkStatus;
