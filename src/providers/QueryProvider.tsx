'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { db } from '@/shared/offline/db';
import { useState, useEffect } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            retry: 1,
            refetchOnWindowFocus: false, // Less aggressive for desktop app feel
          },
        },
      })
  );

  const persister = {
    persistClient: async (client: any) => {
      await db.reactQueryState.put({ key: 'react-query-cache', state: client });
    },
    restoreClient: async () => {
      const record = await db.reactQueryState.get('react-query-cache');
      return record?.state || undefined;
    },
    removeClient: async () => {
      await db.reactQueryState.delete('react-query-cache');
    },
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Avoid hydration mismatch by rendering plain children first on server,
    // but still provide the query client to prevent context errors in SSR hooks.
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
}
