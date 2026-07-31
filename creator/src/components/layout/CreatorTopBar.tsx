import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Button,
  Chip,
  Tooltip,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Bell,
  Sun,
  Moon,
  Radio,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { useThemeStore } from '../../store/theme.store';
import { useCreatorProfileStore } from '../../store/creator-profile.store';
import { useNotificationStore } from '../../store/notification.store';
import { useAuthStore } from '../../store/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { ConnectionStatusBadge } from '../common/ConnectionStatusBadge';

interface CreatorTopBarProps {
  onMobileDrawerToggle: () => void;
  drawerWidth: number;
}

export const CreatorTopBar: React.FC<CreatorTopBarProps> = ({
  onMobileDrawerToggle,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mode, toggleTheme } = useThemeStore();
  const profile = useCreatorProfileStore((state) => state.profile);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const logout = useAuthStore((state) => state.logout);

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleOpenNotifMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNotif(event.currentTarget);
  };
  const handleCloseNotifMenu = () => {
    setAnchorElNotif(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleCloseUserMenu();
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, minHeight: 64 }}>
        {/* Left Side: Mobile Menu Button & Search/Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMobileDrawerToggle}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon size={22} />
          </IconButton>

          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
            <ConnectionStatusBadge />
          </Box>
        </Box>

        {/* Right Side Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
          {/* Quick Action: Start Live Room */}
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Radio size={16} />}
            onClick={() => navigate('/rooms')}
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              fontWeight: 700,
              px: 2,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
            }}
          >
            Start Room
          </Button>

          {/* Theme Toggle Button */}
          <Tooltip title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}>
            <IconButton onClick={toggleTheme} color="inherit" size="small" sx={{ p: 1 }}>
              {mode === 'dark' ? <Sun size={20} color="#fbbf24" /> : <Moon size={20} />}
            </IconButton>
          </Tooltip>

          {/* Notifications Icon & Menu */}
          <Tooltip title="Creator Notifications">
            <IconButton onClick={handleOpenNotifMenu} color="inherit" size="small" sx={{ p: 1 }}>
              <Badge badgeContent={unreadCount} color="error">
                <Bell size={20} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorElNotif}
            open={Boolean(anchorElNotif)}
            onClose={handleCloseNotifMenu}
            slotProps={{
              paper: {
                elevation: 4,
                sx: {
                  width: 360,
                  maxHeight: 440,
                  mt: 1.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                },
              },
            }}
          >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Creator Notifications
              </Typography>
              {unreadCount > 0 && (
                <Button size="small" onClick={markAllAsRead} sx={{ fontSize: '0.75rem' }}>
                  Mark all read
                </Button>
              )}
            </Box>
            <Box sx={{ overflowY: 'auto', maxHeight: 320 }}>
              {notifications.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No new notifications
                  </Typography>
                </Box>
              ) : (
                notifications.map((notif) => (
                  <MenuItem
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id);
                      handleCloseNotifMenu();
                      navigate('/notifications');
                    }}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: notif.read ? 'transparent' : 'action.hover',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                        {notif.title}
                      </Typography>
                      {!notif.read && (
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', ml: 'auto' }} />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, whiteSpace: 'normal' }}>
                      {notif.message}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6875rem' }}>
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </MenuItem>
                ))
              )}
            </Box>
            <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
              <Button size="small" fullWidth onClick={() => { handleCloseNotifMenu(); navigate('/notifications'); }}>
                View All Notifications
              </Button>
            </Box>
          </Menu>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5 }} />

          {/* User Profile Avatar & Dropdown */}
          <Button
            onClick={handleOpenUserMenu}
            sx={{
              p: 0.5,
              borderRadius: 2,
              color: 'text.primary',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Avatar
              src={profile.avatarUrl}
              alt={profile.displayName}
              sx={{ width: 34, height: 34, mr: 1, border: '2px solid', borderColor: 'primary.main' }}
            />
            <Box sx={{ textAlign: 'left', display: { xs: 'none', lg: 'block' }, mr: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.1, fontSize: '0.8125rem' }}>
                {profile.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem' }}>
                {profile.tier} Creator
              </Typography>
            </Box>
            <ChevronDown size={16} />
          </Button>

          <Menu
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
            slotProps={{
              paper: {
                elevation: 4,
                sx: {
                  width: 240,
                  mt: 1.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                },
              },
            }}
          >
            <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {profile.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {profile.handle}
              </Typography>
              <Chip
                label={`${profile.followersCount.toLocaleString()} Followers`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mt: 1, height: 20, fontSize: '0.6875rem' }}
              />
            </Box>

            <Divider />

            <MenuItem onClick={() => handleNavigate('/profile')}>
              <ListItemIcon><User size={18} /></ListItemIcon>
              <ListItemText primary="Creator Profile" />
            </MenuItem>

            <MenuItem onClick={() => handleNavigate('/settings')}>
              <ListItemIcon><Settings size={18} /></ListItemIcon>
              <ListItemText primary="Studio Settings" />
            </MenuItem>

            <MenuItem onClick={() => handleNavigate('/help')}>
              <ListItemIcon><HelpCircle size={18} /></ListItemIcon>
              <ListItemText primary="Help & Guidelines" />
            </MenuItem>

            <Divider />

            <MenuItem
              onClick={() => {
                handleCloseUserMenu();
                window.open('/', '_blank');
              }}
            >
              <ListItemIcon><ExternalLink size={18} /></ListItemIcon>
              <ListItemText primary="View Public Site" />
            </MenuItem>

            <MenuItem
              onClick={() => {
                logout();
                queryClient.clear();
                handleCloseUserMenu();
                navigate('/login', { replace: true });
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon><LogOut size={18} color={theme.palette.error.main} /></ListItemIcon>
              <ListItemText primary="Sign Out" />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
