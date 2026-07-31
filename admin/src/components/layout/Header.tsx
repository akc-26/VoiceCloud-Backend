import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Badge,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';

import { useThemeStore } from '../../store/theme.store';
import { useNotificationsStore } from '../../store/notifications.store';
import { UserDropdown } from './UserDropdown';
import { SearchBar } from '../common/SearchBar';

export const Header: React.FC = () => {
  const toggleSidebar = useThemeStore((state) => state.toggleSidebar);
  const mode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const unreadCount = useNotificationsStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationsStore((state) => state.setUnreadCount);

  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const handleOpenNotif = (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchor(e.currentTarget);
  };

  const handleCloseNotif = () => {
    setNotifAnchor(null);
  };

  const handleClearNotif = () => {
    setUnreadCount(0);
    handleCloseNotif();
  };

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important', px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton edge="start" color="inherit" onClick={toggleSidebar}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <SearchBar placeholder="Global search users, rooms, reports..." onChange={() => {}} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Theme Switcher */}
          <IconButton onClick={toggleTheme} color="inherit" size="medium">
            {mode === 'dark' ? <LightModeIcon sx={{ color: 'warning.light' }} /> : <DarkModeIcon />}
          </IconButton>

          {/* Notifications Bell */}
          <IconButton color="inherit" size="medium" onClick={handleOpenNotif}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Notifications Popover */}
          <Popover
            open={Boolean(notifAnchor)}
            anchorEl={notifAnchor}
            onClose={handleCloseNotif}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { width: 320, p: 0, borderRadius: 2.5 } } }}
          >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Notifications
              </Typography>
              {unreadCount > 0 && (
                <Button size="small" onClick={handleClearNotif}>
                  Mark all as read
                </Button>
              )}
            </Box>
            <Divider />
            <List sx={{ maxH: 280, overflowY: 'auto', p: 0 }}>
              <ListItem sx={{ py: 1.5 }}>
                <ListItemText
                  primary="New Host Verification Application"
                  secondary="User @alex_pro submitted host verification documents."
                  slotProps={{
                    primary: { sx: { fontSize: '0.85rem', fontWeight: 600 } },
                    secondary: { sx: { fontSize: '0.75rem' } },
                  }}
                />
              </ListItem>
              <Divider component="li" />
              <ListItem sx={{ py: 1.5 }}>
                <ListItemText
                  primary="System Security Alert"
                  secondary="Multiple failed login attempts detected on Moderator account."
                  slotProps={{
                    primary: { sx: { fontSize: '0.85rem', fontWeight: 600 } },
                    secondary: { sx: { fontSize: '0.75rem' } },
                  }}
                />
              </ListItem>
            </List>
          </Popover>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* User Profile Menu */}
          <UserDropdown />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
