import React from 'react';
import {
  AppBar,
  Box,
  Divider,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';

import { BRAND_CONFIG } from '@shared/branding';
import { useThemeStore } from '../../store/theme.store';
import { UserDropdown } from './UserDropdown';
import { navItems } from './Sidebar';

export const Header: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = useThemeStore((state) => state.toggleSidebar);
  const toggleMobileSidebar = useThemeStore((state) => state.toggleMobileSidebar);
  const mode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const currentItem = navItems.find((item) => item.path === location.pathname);
  const pageTitle = currentItem?.title || BRAND_CONFIG.products.admin.shortName;

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        backgroundColor: (muiTheme) =>
          muiTheme.palette.mode === 'dark' ? 'rgba(18, 35, 58, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (muiTheme) => muiTheme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ minHeight: '68px !important', px: { xs: 1.5, sm: 2.5, lg: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Tooltip title={isMobile ? 'Open navigation' : 'Toggle navigation'}>
            <IconButton
              edge="start"
              onClick={isMobile ? toggleMobileSidebar : toggleSidebar}
              aria-label={isMobile ? 'Open navigation' : 'Toggle navigation'}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
              {pageTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.2 }}>
              {BRAND_CONFIG.products.admin.workspaceLabel}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={mode === 'dark' ? 'Use light theme' : 'Use dark theme'}>
            <IconButton onClick={toggleTheme} aria-label={mode === 'dark' ? 'Use light theme' : 'Use dark theme'}>
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Notification delivery console">
            <IconButton onClick={() => navigate('/notifications')} aria-label="Open notification delivery console">
              <NotificationsNoneOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.75, my: 1.1 }} />
          <UserDropdown />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
