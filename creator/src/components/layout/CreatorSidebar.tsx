import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  BadgeCheck,
  BarChart3,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  DollarSign,
  Gift,
  HelpCircle,
  LayoutDashboard,
  Radio,
  Settings,
  User,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { BRAND_CONFIG, getBrandAssetUrl } from '@shared/branding';
import { useCreatorProfileStore } from '../../store/creator-profile.store';
import { useNotificationStore } from '../../store/notification.store';

interface CreatorSidebarProps {
  open: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  drawerWidth: number;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  badge?: string | number;
  badgeColor?:
    'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info';
  section?: string;
}

export const CreatorSidebar: React.FC<CreatorSidebarProps> = ({
  open,
  onToggle,
  mobileOpen,
  onMobileClose,
  drawerWidth,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const profile = useCreatorProfileStore((state) => state.profile);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const creatorColors = BRAND_CONFIG.colors.creator;

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      section: 'Home',
    },
    {
      label: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      section: 'Home',
    },
    {
      label: 'Live Rooms',
      path: '/rooms',
      icon: Radio,
      badge: 'LIVE',
      badgeColor: 'error',
      section: 'Live',
    },
    { label: 'Schedule', path: '/schedule', icon: Calendar, section: 'Live' },
    { label: 'Audience', path: '/audience', icon: Users, section: 'Community' },
    {
      label: 'Followers',
      path: '/followers',
      icon: UserCheck,
      section: 'Community',
    },
    {
      label: 'Subscribers',
      path: '/subscribers',
      icon: Crown,
      badge:
        profile.subscribersCount > 0 ? profile.subscribersCount : undefined,
      badgeColor: 'primary',
      section: 'Community',
    },
    { label: 'Wallet', path: '/wallet', icon: Wallet, section: 'Earnings' },
    {
      label: 'Earnings',
      path: '/earnings',
      icon: DollarSign,
      section: 'Earnings',
    },
    { label: 'Gifts', path: '/gifts', icon: Gift, section: 'Earnings' },
    {
      label: 'Payout Requests',
      path: '/payout-requests',
      icon: CreditCard,
      section: 'Earnings',
    },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeColor: 'error',
      section: 'Creator',
    },
    {
      label: 'Host Verification',
      path: '/verification',
      icon: BadgeCheck,
      section: 'Creator',
    },
    { label: 'Profile', path: '/profile', icon: User, section: 'Creator' },
    {
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      section: 'Creator',
    },
    { label: 'Help', path: '/help', icon: HelpCircle, section: 'System' },
  ];

  const isSelected = (path: string) => {
    if (path === '/dashboard') {
      return [
        '/',
        '',
        '/dashboard',
        '/dashboard/',
        '/creator',
        '/creator/dashboard',
      ].includes(location.pathname);
    }
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const handleNavClick = (path: string) => {
    void navigate(path);
    if (isMobile) onMobileClose();
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: creatorColors.navigationBackground,
        color: '#f3faf6',
      }}
    >
      <Box
        sx={{
          minHeight: 72,
          px: open ? 2.5 : 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          borderBottom: '1px solid rgba(216, 227, 222, 0.12)',
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2.5,
              bgcolor: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 22px rgba(0,0,0,0.16)',
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src={getBrandAssetUrl('creator', 'logoMark')}
              alt=""
              sx={{ width: 34, height: 34 }}
            />
          </Box>
          {open && (
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, lineHeight: 1.15, color: '#ffffff' }}
              >
                {BRAND_CONFIG.identity.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(243,250,246,0.66)', fontWeight: 500 }}
              >
                {BRAND_CONFIG.products.creator.shortName}
              </Typography>
            </Box>
          )}
        </Box>
        {!isMobile && open && (
          <Tooltip title="Collapse sidebar">
            <IconButton
              onClick={onToggle}
              size="small"
              sx={{ color: 'rgba(243,250,246,0.72)' }}
            >
              <ChevronLeft size={18} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {open && (
        <Box
          sx={{
            mx: 2,
            mt: 2,
            mb: 1,
            p: 1.5,
            borderRadius: 3,
            border: '1px solid rgba(94,234,212,0.16)',
            bgcolor: 'rgba(255,255,255,0.045)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            src={profile.avatarUrl || undefined}
            alt={profile.displayName}
            sx={{
              width: 40,
              height: 40,
              border: '2px solid rgba(94,234,212,0.74)',
            }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: '#ffffff' }}
              noWrap
            >
              {profile.displayName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(243,250,246,0.64)' }}
              noWrap
            >
              {profile.handle}
            </Typography>
          </Box>
          <Chip
            label={profile.tier}
            size="small"
            sx={{
              height: 20,
              bgcolor: 'rgba(34,197,94,0.17)',
              color: creatorColors.primaryLight,
              fontSize: '0.65rem',
              fontWeight: 700,
            }}
          />
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto', px: open ? 1.5 : 1, py: 1.25 }}>
        <List disablePadding>
          {navItems.map((item, index) => {
            const active = isSelected(item.path);
            const showSectionHeader =
              open &&
              (index === 0 || navItems[index - 1].section !== item.section);

            return (
              <React.Fragment key={item.path}>
                {showSectionHeader && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      px: 1.5,
                      pt: index === 0 ? 0.25 : 2,
                      pb: 0.75,
                      color: 'rgba(243,250,246,0.46)',
                      fontWeight: 700,
                      fontSize: '0.625rem',
                      letterSpacing: '0.09em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.section}
                  </Typography>
                )}

                <Tooltip title={!open ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => handleNavClick(item.path)}
                    selected={active}
                    sx={{
                      minHeight: 40,
                      borderRadius: 2.5,
                      mb: 0.5,
                      px: open ? 1.5 : 1.25,
                      justifyContent: open ? 'initial' : 'center',
                      color: active ? '#ffffff' : 'rgba(243,250,246,0.76)',
                      '&.Mui-selected': {
                        bgcolor: 'rgba(34,197,94,0.17)',
                        color: '#ffffff',
                        boxShadow: 'inset 3px 0 0 #22c55e',
                        '&:hover': { bgcolor: 'rgba(34,197,94,0.21)' },
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.055)',
                        color: '#ffffff',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 1.5 : 'auto',
                        justifyContent: 'center',
                        color: active
                          ? creatorColors.primaryLight
                          : 'rgba(243,250,246,0.68)',
                      }}
                    >
                      <item.icon size={18} />
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.8125rem',
                              fontWeight: active ? 700 : 500,
                            }}
                          >
                            {item.label}
                          </Typography>
                        }
                      />
                    )}
                    {open && item.badge !== undefined && (
                      <Chip
                        label={item.badge}
                        size="small"
                        color={item.badgeColor || 'primary'}
                        sx={{
                          height: 18,
                          minWidth: 28,
                          fontSize: '0.625rem',
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ borderColor: 'rgba(216,227,222,0.10)' }} />
      <Box sx={{ p: open ? 2 : 1.25, textAlign: 'center' }}>
        {open ? (
          <>
            <Typography
              variant="caption"
              sx={{ display: 'block', color: 'rgba(243,250,246,0.58)' }}
            >
              {BRAND_CONFIG.products.creator.workspaceLabel}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: creatorColors.primaryLight, fontWeight: 600 }}
            >
              Live-ready workspace
            </Typography>
          </>
        ) : (
          <Tooltip title="Expand sidebar" placement="right">
            <IconButton
              onClick={onToggle}
              size="small"
              sx={{ color: 'rgba(243,250,246,0.72)' }}
            >
              <ChevronRight size={18} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: open ? drawerWidth : 72,
          flexShrink: 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 72,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            borderRight: '1px solid rgba(216,227,222,0.12)',
            bgcolor: creatorColors.navigationBackground,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: creatorColors.navigationBackground,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};
