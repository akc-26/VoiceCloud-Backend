import React, { useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useThemeStore } from './store/theme.store';
import { getCreatorTheme } from './theme/theme';
import { AppRoutes } from './routes/AppRoutes';

import { RealtimeToastProvider } from './components/common/RealtimeToast';
import { SocketProvider } from './services/socket-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export const App: React.FC = () => {
  const mode = useThemeStore((state) => state.mode);
  const theme = useMemo(() => getCreatorTheme(mode), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RealtimeToastProvider>
          <SocketProvider>
            <BrowserRouter basename="/creator">
              <AppRoutes />
            </BrowserRouter>
          </SocketProvider>
        </RealtimeToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
