import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { websiteQueryClient } from '@/api/query-client';
import { AuthBootstrap } from '@/app/bootstrap/AuthBootstrap';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={websiteQueryClient}>
      <BrowserRouter>
        <AuthBootstrap>{children}</AuthBootstrap>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
