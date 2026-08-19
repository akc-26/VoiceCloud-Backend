import React from 'react';
import { Alert, Box, Container, Snackbar } from '@mui/material';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { useNotificationsStore } from '../../store/notifications.store';

export const MainLayout: React.FC = () => {
  const toasts = useNotificationsStore((state) => state.toasts);
  const removeToast = useNotificationsStore((state) => state.removeToast);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflowX: 'hidden',
          backgroundImage: (theme) =>
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 72% -20%, rgba(37,99,235,0.08), transparent 34%)'
              : 'radial-gradient(circle at 72% -18%, rgba(56,189,248,0.075), transparent 34%)',
        }}
      >
        <Header />
        <Container
          maxWidth={false}
          sx={{
            width: '100%',
            maxWidth: '1680px',
            py: { xs: 2, md: 2.5 },
            px: { xs: 1.5, sm: 2.5, lg: 3 },
            mx: 'auto',
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Breadcrumbs />
          <Box
            sx={{
              mt: 0.75,
              flexGrow: 1,
              '& > *': {
                animation: 'vc-admin-page-in 180ms ease-out',
              },
              '@keyframes vc-admin-page-in': {
                from: { opacity: 0, transform: 'translateY(3px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
              '@media (prefers-reduced-motion: reduce)': {
                '& > *': { animation: 'none' },
              },
            }}
          >
            <Outlet />
          </Box>
        </Container>
      </Box>

      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open
          autoHideDuration={4000}
          onClose={() => removeToast(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => removeToast(toast.id)}
            severity={toast.type}
            variant="standard"
            sx={{ width: '100%', minWidth: { sm: 320 }, fontWeight: 600 }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};
