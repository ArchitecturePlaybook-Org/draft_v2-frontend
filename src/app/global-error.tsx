'use client';

import { useEffect } from 'react';
import { captureFrontendError } from '@/lib/error-handler/centralErrorHandler';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureFrontendError(error, {
      source: 'next_global_error_page',
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold mb-2">Critical Application Error</h1>
        <p className="text-muted-foreground text-sm mb-6 max-w-md">
          A critical root rendering error occurred. The incident has been recorded by the central error handler.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Recover Application
        </button>
      </body>
    </html>
  );
}
