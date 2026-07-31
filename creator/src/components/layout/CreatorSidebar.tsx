import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Chip,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  LayoutDashboard,
  BarChart3,
  Radio,
  Calendar,
  Users,
  UserCheck,
  Crown,
  Wallet,
  DollarSign,
  Gift,
  CreditCard,
  Bell,
  User,
  BadgeCheck,
  Settings,
  HelpCircle,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
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
  badgeColor?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info';
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

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, section: 'Core' },
    { label: 'Analytics', path: '/analytics', icon: BarChart3, section: 'Core' },
    { label: 'Live Rooms', path: '/rooms', icon: Radio, badge: 'LIVE', badgeColor: 'error', section: 'Core' },
    { label: 'Schedule', path: '/schedule', icon: Calendar, section: 'Core' },

    { label: 'Audience', path: '/audience', icon: Users, section: 'Community' },
    { label: 'Followers', path: '/followers', icon: UserCheck, section: 'Community' },
    { label: 'Subscribers', path: '/subscribers', icon: Crown, badge: profile.subscribersCount, badgeColor: 'primary', section: 'Community' },

    { label: 'Wallet', path: '/wallet', icon: Wallet, section: 'Monetization' },
    { label: 'Earnings', path: '/earnings', icon: DollarSign, section: 'Monetization' },
    { label: 'Gifts', path: '/gifts', icon: Gift, section: 'Monetization' },
    { label: 'Payout Requests', path: '/payout-requests', icon: CreditCard, section: 'Monetization' },

    { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined, badgeColor: 'error', section: 'Account' },
    { label: 'Profile', path: '/profile', icon: User, section: 'Account' },
    { label: 'Host Verification', path: '/verification', icon: BadgeCheck, section: 'Account' },
    { label: 'Settings', path: '/settings', icon: Settings, section: 'Account' },
    { label: 'Help', path: '/help', icon: HelpCircle, section: 'Support' },
  ];

  const isSelected = (path: string) => {
    if (path === '/dashboard' || path === '/') {
      return (
        location.pathname === '/' ||
        location.pathname === '' ||
        location.pathname === '/dashboard' ||
        location.pathname === '/dashboard/' ||
        location.pathname === '/creator' ||
        location.pathname === '/creator/dashboard'
      );
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      onMobileClose();
    }
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Sidebar Header / Brand */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
            }}
          >
            <Radio size={20} />
          </Box>
          {open && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                Creator Studio
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Sparkles size={11} color={theme.palette.primary.main} /> VoiceCloud Studio
              </Typography>
            </Box>
          )}
        </Box>
        {!isMobile && open && (
          <Tooltip title="Collapse sidebar">
            <IconButton onClick={onToggle} size="small" sx={{ color: 'text.secondary' }}>
              <ChevronLeft size={18} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Creator Profile Badge inside Sidebar */}
      {open && (
        <Box
          sx={{
            m: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(124, 58, 237, 0.04)',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar src={profile.avatarUrl} alt={profile.displayName} sx={{ width: 40, height: 40, border: '2px solid', borderColor: 'primary.main' }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile.handle}
            </Typography>
          </Box>
          <Chip label={profile.tier} size="small" color="primary" sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700 }} />
        </Box>
      )}

      {/* Navigation List */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: open ? 1.5 : 1, py: 1 }}>
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
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      px: 2,
                      pt: index === 0 ? 0.5 : 2,
                      pb: 0.5,
                      fontWeight: 700,
                      fontSize: '0.6875rem',
                      letterSpacing: '0.08em',
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
                      borderRadius: 2,
                      mb: 0.5,
                      py: 1,
                      px: open ? 1.5 : 1.25,
                      justifyContent: open ? 'initial' : 'center',
                      '&.Mui-selected': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.08)',
                        color: 'primary.main',
                        fontWeight: 700,
                        borderLeft: '3px solid',
                        borderColor: 'primary.main',
                        '& .MuiListItemIcon-root': {
                          color: 'primary.main',
                        },
                      },
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 1.5 : 'auto',
                        justifyContent: 'center',
                        color: active ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      <item.icon size={19} />
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '0.875rem',
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
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          px: 0.5,
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

      <Divider sx={{ my: 1 }} />

      {/* Footer Version Info inside Drawer */}
      {open && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
            VoiceCloud Creator Workspace
          </Typography>
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, fontSize: '0.6875rem' }}>
            VC-PH04A Foundation Ready
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Desktop Drawer */}
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
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile Temporary Drawer */}
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
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};
