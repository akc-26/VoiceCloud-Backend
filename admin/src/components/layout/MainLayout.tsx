import React from 'react';
import { Box, Container, Snackbar, Alert } from '@mui/material';
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
        }}
      >
        <Header />
        <Container maxWidth="xl" sx={{ py: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Breadcrumbs />
          <Box sx={{ mt: 1, flexGrow: 1 }}>
            <Outlet />
          </Box>
        </Container>
      </Box>

      {/* Global Toast Snackbars */}
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={4000}
          onClose={() => removeToast(toast.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => removeToast(toast.id)}
            severity={toast.type}
            variant="filled"
            sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};
