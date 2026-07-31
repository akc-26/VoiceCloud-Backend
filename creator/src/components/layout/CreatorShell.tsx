import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, CssBaseline, useMediaQuery, useTheme } from '@mui/material';
import { CreatorTopBar } from './CreatorTopBar';
import { CreatorSidebar } from './CreatorSidebar';
import { CreatorBreadcrumbs } from './CreatorBreadcrumbs';
import { CreatorFooter } from './CreatorFooter';

const DRAWER_WIDTH = 260;

interface CreatorShellProps {
  children?: React.ReactNode;
}

export const CreatorShell: React.FC<CreatorShellProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleDesktopSidebarToggle = () => {
    setDesktopSidebarOpen(!desktopSidebarOpen);
  };

  const handleMobileSidebarToggle = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />

      {/* Sidebar Navigation */}
      <CreatorSidebar
        open={desktopSidebarOpen}
        onToggle={handleDesktopSidebarToggle}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        drawerWidth={DRAWER_WIDTH}
      />

      {/* Right Column: TopBar + Page Content + Footer */}
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
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Top Application Bar */}
        <CreatorTopBar
          onMobileDrawerToggle={handleMobileSidebarToggle}
          drawerWidth={DRAWER_WIDTH}
        />

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            bgcolor: 'background.default',
          }}
        >
          <Container maxWidth="xl" disableGutters>
            {/* Dynamic Breadcrumbs */}
            <CreatorBreadcrumbs />

            {/* Page Content */}
            {children || <Outlet />}
          </Container>
        </Box>

        {/* Studio Footer */}
        <CreatorFooter />
      </Box>
    </Box>
  );
};
