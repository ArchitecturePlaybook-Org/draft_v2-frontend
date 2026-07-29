'use client';

import { useEffect, ReactNode } from 'react';
import { captureFrontendError } from '@/lib/error-handler/centralErrorHandler';

export function GlobalErrorListener({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Unhandled Global JS Runtime Errors
    const handleError = (event: ErrorEvent) => {
      captureFrontendError(event.error || event.message, {
        source: 'window_onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    // 2. Unhandled Promise Rejections (async/await uncaught failures)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      captureFrontendError(event.reason, {
        source: 'unhandled_rejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
}
