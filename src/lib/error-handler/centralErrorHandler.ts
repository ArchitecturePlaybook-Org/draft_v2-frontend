export interface ErrorContext {
  source?: 'react_error_boundary' | 'window_onerror' | 'unhandled_rejection' | 'api_proxy' | 'next_error_page' | string;
  componentStack?: string;
  url?: string;
  [key: string]: any;
}

export interface ErrorPayload {
  timestamp: string;
  source: string;
  name: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  componentStack?: string;
  extra?: Record<string, any>;
}

/**
 * CENTRALIZED FRONTEND ERROR HANDLER HOOK
 * 
 * This function captures ANY runtime, React component rendering, unhandled JS error,
 * promise rejection, or API proxy error across the entire Next.js application.
 */
export function captureFrontendError(
  error: Error | string | unknown,
  context: ErrorContext = {}
): ErrorPayload {
  const isBrowser = typeof window !== 'undefined';
  
  let name = 'Error';
  let message = 'An unknown error occurred';
  let stack: string | undefined = undefined;

  if (error instanceof Error) {
    name = error.name || 'Error';
    message = error.message || String(error);
    stack = error.stack;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    message = (error as any).message || JSON.stringify(error);
  }

  const payload: ErrorPayload = {
    timestamp: new Date().toISOString(),
    source: context.source || 'frontend',
    name,
    message,
    stack,
    url: context.url || (isBrowser ? window.location.href : undefined),
    userAgent: isBrowser ? navigator.userAgent : undefined,
    componentStack: context.componentStack,
    extra: context,
  };

  // Standard Developer Console Log
  console.error(
    `[CENTRAL_FE_ERROR] [${payload.source}] ${payload.name}: ${payload.message}`,
    payload
  );

  // =========================================================================
  // POST-CAPTURE EXTENSION HOOK
  // Add your custom client-side persistence / export logic here:
  // e.g., fetch('/api/log-error', { method: 'POST', body: JSON.stringify(payload) })
  // e.g., write to IndexDB, MongoDB endpoint, S3 API, or analytics service.
  // =========================================================================
  try {
    // Example Hook:
    // if (isBrowser) {
    //   fetch('/api/logs/error', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload),
    //   }).catch(() => {});
    // }
  } catch (hookErr) {
    console.error('[CENTRAL_FE_ERROR] Exception inside post-capture extension hook:', hookErr);
  }

  return payload;
}
