import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Box,
  Container,
  CssBaseline,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CreatorTopBar } from './CreatorTopBar';
import { CreatorSidebar } from './CreatorSidebar';
import { CreatorBreadcrumbs } from './CreatorBreadcrumbs';
import { CreatorFooter } from './CreatorFooter';

const DRAWER_WIDTH = 244;

interface CreatorShellProps {
  children?: React.ReactNode;
}

export const CreatorShell: React.FC<CreatorShellProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <CssBaseline />
      <CreatorSidebar
        open={desktopSidebarOpen}
        onToggle={() => setDesktopSidebarOpen((value) => !value)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        drawerWidth={DRAWER_WIDTH}
      />

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
          width: {
            xs: '100%',
            md: `calc(100% - ${desktopSidebarOpen ? DRAWER_WIDTH : 72}px)`,
          },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <CreatorTopBar
          onMobileDrawerToggle={() => setMobileSidebarOpen((value) => !value)}
          drawerWidth={DRAWER_WIDTH}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3, lg: 4 },
            pt: { xs: 2, sm: 2.5, lg: 3 },
            pb: { xs: 4, md: 5 },
            bgcolor: 'transparent',
          }}
        >
          <Container
            maxWidth={false}
            disableGutters
            sx={{ maxWidth: 1680, mx: 'auto' }}
          >
            {!isMobile && <CreatorBreadcrumbs />}
            {children || <Outlet />}
          </Container>
        </Box>

        <CreatorFooter />
      </Box>
    </Box>
  );
};
