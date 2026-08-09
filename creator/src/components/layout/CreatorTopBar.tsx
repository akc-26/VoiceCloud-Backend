import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
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
import { BRAND_CONFIG } from '@shared/branding';
import { useThemeStore } from '../../store/theme.store';
import { useCreatorProfileStore } from '../../store/creator-profile.store';
import { useNotificationStore } from '../../store/notification.store';
import { useAuthStore } from '../../store/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { ConnectionStatusBadge } from '../common/ConnectionStatusBadge';
import { useCreatorNotifications } from '../../hooks/useCreatorDashboard';
import { creatorApi } from '../../services/creator-api.service';

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
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotificationStore();
  const logout = useAuthStore((state) => state.logout);
  useCreatorNotifications();

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);
  const [notificationActionError, setNotificationActionError] = useState<
    string | null
  >(null);

  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleCloseNotifMenu = () => {
    setAnchorElNotif(null);
    setNotificationActionError(null);
  };

  const persistMarkAllNotificationsRead = async () => {
    setNotificationActionError(null);
    try {
      await creatorApi.markAllNotificationsRead();
      markAllAsRead();
      await queryClient.invalidateQueries({
        queryKey: ['creator', 'notifications'],
      });
    } catch (error: any) {
      setNotificationActionError(
        error?.message || 'Failed to mark notifications as read',
      );
    }
  };

  const persistNotificationRead = async (notificationId: string) => {
    setNotificationActionError(null);
    try {
      await creatorApi.markNotificationRead(notificationId);
      markAsRead(notificationId);
      await queryClient.invalidateQueries({
        queryKey: ['creator', 'notifications'],
      });
      handleCloseNotifMenu();
      void navigate('/notifications');
    } catch (error: any) {
      setNotificationActionError(
        error?.message || 'Failed to mark notification as read',
      );
    }
  };

  const handleNavigate = (path: string) => {
    void navigate(path);
    handleCloseUserMenu();
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: BRAND_CONFIG.colors.creator.navigationBackground,
        color: '#f3faf6',
        borderBottom: '1px solid rgba(216,227,222,0.12)',
        zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
        boxShadow: '0 8px 24px rgba(4,18,12,0.08)',
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
          minHeight: 64,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton
            aria-label="open drawer"
            edge="start"
            onClick={onMobileDrawerToggle}
            sx={{ display: { md: 'none' }, color: 'inherit' }}
          >
            <MenuIcon size={22} />
          </IconButton>
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: 'rgba(243,250,246,0.68)', fontWeight: 600 }}
            >
              {BRAND_CONFIG.products.creator.shortName}
            </Typography>
            <ConnectionStatusBadge />
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 },
          }}
        >
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Radio size={16} />}
            onClick={() => {
              void navigate('/rooms');
            }}
            sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              px: 2.25,
              color: '#07130d',
              boxShadow: '0 8px 22px rgba(34,197,94,0.22)',
            }}
          >
            Start Room
          </Button>

          <Tooltip
            title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            <IconButton
              onClick={toggleTheme}
              size="small"
              sx={{ color: 'rgba(243,250,246,0.82)' }}
            >
              {mode === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Creator Notifications">
            <IconButton
              onClick={(event) => setAnchorElNotif(event.currentTarget)}
              size="small"
              sx={{ color: 'rgba(243,250,246,0.82)' }}
            >
              <Badge badgeContent={unreadCount} color="error">
                <Bell size={19} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorElNotif}
            open={Boolean(anchorElNotif)}
            onClose={handleCloseNotifMenu}
            slotProps={{
              paper: {
                elevation: 6,
                sx: { width: 360, maxHeight: 440, mt: 1.5 },
              },
            }}
          >
            <Box
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Creator Notifications
              </Typography>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  onClick={() => {
                    void persistMarkAllNotificationsRead();
                  }}
                >
                  Mark all read
                </Button>
              )}
            </Box>
            {notificationActionError && (
              <Alert severity="error" sx={{ mx: 1.5, mt: 1.5 }}>
                {notificationActionError}
              </Alert>
            )}
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
                    onClick={() => void persistNotificationRead(notif.id)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: notif.read ? 'transparent' : 'action.selected',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, fontSize: '0.8125rem' }}
                      >
                        {notif.title}
                      </Typography>
                      {!notif.read && (
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            ml: 1,
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.75rem',
                        mb: 0.5,
                        whiteSpace: 'normal',
                      }}
                    >
                      {notif.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ opacity: 0.72 }}
                    >
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </MenuItem>
                ))
              )}
            </Box>
            <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                size="small"
                fullWidth
                onClick={() => {
                  handleCloseNotifMenu();
                  void navigate('/notifications');
                }}
              >
                View All Notifications
              </Button>
            </Box>
          </Menu>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, my: 1.5, borderColor: 'rgba(216,227,222,0.16)' }}
          />

          <Button
            onClick={(event) => setAnchorElUser(event.currentTarget)}
            sx={{
              p: 0.5,
              borderRadius: 2.5,
              color: '#f3faf6',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            <Avatar
              src={profile.avatarUrl || undefined}
              alt={profile.displayName}
              sx={{
                width: 34,
                height: 34,
                mr: { xs: 0, lg: 1 },
                border: '2px solid rgba(94,234,212,0.70)',
              }}
            />
            <Box
              sx={{
                textAlign: 'left',
                display: { xs: 'none', lg: 'block' },
                mr: 0.5,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, lineHeight: 1.1, color: '#ffffff' }}
              >
                {profile.displayName}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(243,250,246,0.62)' }}
              >
                {profile.tier} Creator
              </Typography>
            </Box>
            <ChevronDown size={16} />
          </Button>

          <Menu
            anchorEl={anchorElUser}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
            slotProps={{ paper: { elevation: 6, sx: { width: 240, mt: 1.5 } } }}
          >
            <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {profile.displayName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block' }}
              >
                {profile.handle}
              </Typography>
              {profile.followersCount > 0 && (
                <Chip
                  label={`${profile.followersCount.toLocaleString()} Followers`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mt: 1, height: 20, fontSize: '0.6875rem' }}
                />
              )}
            </Box>
            <Divider />
            <MenuItem onClick={() => handleNavigate('/profile')}>
              <ListItemIcon>
                <User size={18} />
              </ListItemIcon>
              <ListItemText primary="Creator Profile" />
            </MenuItem>
            <MenuItem onClick={() => handleNavigate('/settings')}>
              <ListItemIcon>
                <Settings size={18} />
              </ListItemIcon>
              <ListItemText primary="Studio Settings" />
            </MenuItem>
            <MenuItem onClick={() => handleNavigate('/help')}>
              <ListItemIcon>
                <HelpCircle size={18} />
              </ListItemIcon>
              <ListItemText primary="Help & Guidelines" />
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                handleCloseUserMenu();
                window.open('/', '_blank');
              }}
            >
              <ListItemIcon>
                <ExternalLink size={18} />
              </ListItemIcon>
              <ListItemText primary="View Public Site" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                logout();
                queryClient.clear();
                handleCloseUserMenu();
                void navigate('/login', { replace: true });
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <LogOut size={18} color={theme.palette.error.main} />
              </ListItemIcon>
              <ListItemText primary="Sign Out" />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
