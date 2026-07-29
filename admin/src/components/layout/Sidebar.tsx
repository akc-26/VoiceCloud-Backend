import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import BusinessIcon from '@mui/icons-material/Business';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import GavelIcon from '@mui/icons-material/Gavel';
import CampaignIcon from '@mui/icons-material/Campaign';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import ArticleIcon from '@mui/icons-material/Article';
import FlagIcon from '@mui/icons-material/Flag';
import ExtensionIcon from '@mui/icons-material/Extension';
import SettingsIcon from '@mui/icons-material/Settings';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import BackupIcon from '@mui/icons-material/Backup';
import SecurityIcon from '@mui/icons-material/Security';
import ChatIcon from '@mui/icons-material/Chat';

import { useAuthStore, UserRole } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';

export interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  badge?: string;
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { title: 'Users', path: '/users', icon: <PeopleIcon /> },
  { title: 'Rooms', path: '/rooms', icon: <MeetingRoomIcon /> },
  { title: 'Wallet', path: '/wallet', icon: <AccountBalanceWalletIcon /> },
  { title: 'Gifts', path: '/gifts', icon: <CardGiftcardIcon /> },
  { title: 'VIP', path: '/vip', icon: <WorkspacePremiumIcon /> },
  { title: 'Hosts', path: '/hosts', icon: <RecordVoiceOverIcon /> },
  { title: 'Agencies', path: '/agencies', icon: <BusinessIcon /> },
  { title: 'Rankings', path: '/rankings', icon: <LeaderboardIcon /> },
  { title: 'Tasks & Achievements', path: '/tasks-achievements', icon: <EmojiEventsIcon /> },
  { title: 'Reports', path: '/reports', icon: <ReportProblemIcon />, badge: '5' },
  { title: 'Moderation', path: '/moderation', icon: <GavelIcon /> },
  { title: 'Announcements', path: '/announcements', icon: <CampaignIcon /> },
  { title: 'Notifications', path: '/notifications', icon: <NotificationsIcon /> },
  { title: 'Messaging', path: '/messaging', icon: <ChatIcon /> },
  { title: 'RTC Engine', path: '/rtc', icon: <SettingsInputComponentIcon /> },
  { title: 'CMS Pages', path: '/cms', icon: <ArticleIcon /> },
  { title: 'Feature Flags', path: '/feature-flags', icon: <FlagIcon /> },
  { title: 'Provider Configs', path: '/provider-configs', icon: <ExtensionIcon /> },
  { title: 'Backup & DR', path: '/backups', icon: <BackupIcon /> },
  { title: 'Auth & Identity', path: '/auth-management', icon: <SecurityIcon /> },
  { title: 'System Settings', path: '/system-settings', icon: <SettingsIcon /> },
  { title: 'App Versions', path: '/app-versions', icon: <SystemUpdateIcon /> },
  { title: 'Audit Logs', path: '/audit-logs', icon: <HistoryIcon /> },
  { title: 'Analytics', path: '/analytics', icon: <AssessmentIcon /> },
  { title: 'Support Desk', path: '/support', icon: <HelpOutlinedIcon /> },
  { title: 'My Profile', path: '/profile', icon: <PersonIcon /> },
];

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const user = useAuthStore((state) => state.user);
  const hasRole = useAuthStore((state) => state.hasRole);
  const logout = useAuthStore((state) => state.logout);

  const sidebarCollapsed = useThemeStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useThemeStore((state) => state.toggleSidebar);

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentWidth = sidebarCollapsed && !isMobile ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? !sidebarCollapsed : true}
      onClose={toggleSidebar}
      sx={{
        width: currentWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: currentWidth,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          backgroundColor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflowX: 'hidden',
        },
      }}
    >
      {/* Brand Logo & Header */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          px: sidebarCollapsed ? 1 : 2.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GraphicEqIcon color="primary" sx={{ fontSize: 28 }} />
          {!sidebarCollapsed && (
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }} color="primary.main">
              VoiceCloud
            </Typography>
          )}
        </Box>
        {!isMobile && !sidebarCollapsed && (
          <IconButton size="small" onClick={toggleSidebar}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation List */}
      <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1.5, px: 1 }}>
        <List disablePadding>
          {navItems.map((item) => {
            if (item.roles && !hasRole(item.roles)) return null;
            const isSelected = location.pathname === item.path;

            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleNavClick(item.path)}
                  sx={{
                    borderRadius: 2,
                    minHeight: 44,
                    px: sidebarCollapsed ? 1.5 : 2,
                    justifyContent: sidebarCollapsed ? 'center' : 'initial',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      },
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: sidebarCollapsed ? 0 : 36,
                      mr: sidebarCollapsed ? 'auto' : 0,
                      justifyContent: 'center',
                      color: isSelected ? 'inherit' : 'text.secondary',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!sidebarCollapsed && (
                    <ListItemText
                      primary={item.title}
                      slotProps={{
                        primary: {
                          sx: {
                            fontSize: '0.875rem',
                            fontWeight: isSelected ? 700 : 500,
                          },
                        },
                      }}
                    />
                  )}
                  {!sidebarCollapsed && item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      color={isSelected ? 'secondary' : 'error'}
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider />

      {/* User Info & Logout Button */}
      <Box sx={{ p: sidebarCollapsed ? 1 : 2 }}>
        {!sidebarCollapsed && user && (
          <Box sx={{ mb: 1.5, px: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {user.displayName || user.username}
            </Typography>
            <Chip
              label={user.role}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem', mt: 0.5 }}
            />
          </Box>
        )}
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            minHeight: 40,
            color: 'error.main',
            justifyContent: sidebarCollapsed ? 'center' : 'initial',
            px: sidebarCollapsed ? 1.5 : 2,
          }}
        >
          <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 0 : 36, color: 'error.main' }}>
            <LogoutIcon />
          </ListItemIcon>
          {!sidebarCollapsed && (
            <ListItemText
              primary="Logout"
              slotProps={{ primary: { sx: { fontSize: '0.875rem', fontWeight: 600 } } }}
            />
          )}
        </ListItemButton>
      </Box>
    </Drawer>
  );
};
