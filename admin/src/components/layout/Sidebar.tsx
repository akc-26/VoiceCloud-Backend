import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
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
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import BackupIcon from '@mui/icons-material/Backup';
import SecurityIcon from '@mui/icons-material/Security';
import ChatIcon from '@mui/icons-material/Chat';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import ShareIcon from '@mui/icons-material/Share';

import { BRAND_CONFIG, getBrandAssetUrl } from '@shared/branding';
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
  { title: 'Rankings', path: '/rankings', icon: <LeaderboardIcon /> },
  { title: 'Tasks & Achievements', path: '/tasks-achievements', icon: <EmojiEventsIcon /> },
  { title: 'Store & Mall', path: '/store', icon: <ShoppingBagIcon /> },
  { title: 'Referral System', path: '/referrals', icon: <ShareIcon /> },
  { title: 'Reports', path: '/reports', icon: <ReportProblemIcon /> },
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

interface NavSection {
  label: string;
  paths: string[];
}

const navSections: NavSection[] = [
  { label: 'Overview', paths: ['/dashboard', '/rooms'] },
  { label: 'User Management', paths: ['/users', '/hosts', '/auth-management'] },
  {
    label: 'Economy',
    paths: ['/wallet', '/gifts', '/vip', '/tasks-achievements', '/rankings', '/referrals', '/store'],
  },
  {
    label: 'Operations',
    paths: ['/reports', '/moderation', '/notifications', '/messaging', '/announcements', '/rtc', '/analytics'],
  },
  {
    label: 'Platform',
    paths: ['/cms', '/feature-flags', '/provider-configs', '/backups', '/app-versions'],
  },
  { label: 'System', paths: ['/system-settings', '/audit-logs', '/support', '/profile'] },
];

const DRAWER_WIDTH = 272;
const COLLAPSED_WIDTH = 76;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const user = useAuthStore((state) => state.user);
  const hasRole = useAuthStore((state) => state.hasRole);
  const logout = useAuthStore((state) => state.logout);

  const sidebarCollapsed = useThemeStore((state) => state.sidebarCollapsed);
  const mobileSidebarOpen = useThemeStore((state) => state.mobileSidebarOpen);
  const toggleSidebar = useThemeStore((state) => state.toggleSidebar);
  const setMobileSidebarOpen = useThemeStore((state) => state.setMobileSidebarOpen);

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) setMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileSidebarOpen(false);
    navigate('/login');
  };

  const collapsed = sidebarCollapsed && !isMobile;
  const currentWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;
  const itemByPath = new Map(navItems.map((item) => [item.path, item]));

  const renderItem = (item: NavItem) => {
    if (item.roles && !hasRole(item.roles)) return null;
    const isSelected = location.pathname === item.path;

    const button = (
      <ListItemButton
        selected={isSelected}
        onClick={() => handleNavClick(item.path)}
        aria-current={isSelected ? 'page' : undefined}
        sx={{
          mx: collapsed ? 0.75 : 1.25,
          mb: 0.25,
          minHeight: 40,
          px: collapsed ? 1 : 1.4,
          borderRadius: 2.25,
          justifyContent: collapsed ? 'center' : 'initial',
          color: isSelected ? 'primary.dark' : 'text.secondary',
          '& .MuiListItemIcon-root': {
            color: 'inherit',
          },
          '&.Mui-selected': {
            color: 'primary.dark',
            backgroundColor: (muiTheme) =>
              muiTheme.palette.mode === 'dark'
                ? 'rgba(37, 99, 235, 0.18)'
                : BRAND_CONFIG.colors.admin.navigationSelected,
            boxShadow: (muiTheme) =>
              muiTheme.palette.mode === 'dark'
                ? 'inset 3px 0 0 rgba(96, 165, 250, 0.9)'
                : `inset 3px 0 0 ${BRAND_CONFIG.colors.admin.primary}`,
            '&:hover': {
              backgroundColor: (muiTheme) =>
                muiTheme.palette.mode === 'dark'
                  ? 'rgba(37, 99, 235, 0.24)'
                  : 'rgba(37, 99, 235, 0.12)',
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 34,
            justifyContent: 'center',
            '& .MuiSvgIcon-root': { fontSize: 19 },
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={item.title}
            slotProps={{
              primary: {
                sx: {
                  fontSize: '0.79rem',
                  fontWeight: isSelected ? 650 : 500,
                  whiteSpace: 'nowrap',
                },
              },
            }}
          />
        )}
        {!collapsed && item.badge && (
          <Chip label={item.badge} size="small" color="error" sx={{ height: 20, minWidth: 22, fontSize: '0.66rem' }} />
        )}
      </ListItemButton>
    );

    return (
      <ListItem key={item.path} disablePadding>
        {collapsed ? <Tooltip title={item.title} placement="right">{button}</Tooltip> : button}
      </ListItem>
    );
  };

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileSidebarOpen : true}
      onClose={() => setMobileSidebarOpen(false)}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: isMobile ? 0 : currentWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: currentWidth,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
          backgroundColor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          overflowX: 'hidden',
          boxShadow: theme.palette.mode === 'dark' ? '8px 0 32px rgba(0,0,0,0.12)' : '8px 0 30px rgba(16,35,63,0.025)',
        },
      }}
    >
      <Box
        sx={{
          minHeight: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 1 : 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            component="img"
            src={getBrandAssetUrl('admin', 'logoMark')}
            alt={`${BRAND_CONFIG.identity.name} logo`}
            sx={{ width: 34, height: 34, flexShrink: 0 }}
          />
          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 750, lineHeight: 1.2 }} noWrap>
                {BRAND_CONFIG.identity.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }} noWrap>
                {BRAND_CONFIG.products.admin.shortName}
              </Typography>
            </Box>
          )}
        </Box>
        {!isMobile && !collapsed && (
          <Tooltip title="Collapse navigation">
            <IconButton size="small" onClick={toggleSidebar} aria-label="Collapse navigation">
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1.1 }}>
        {navSections.map((section, sectionIndex) => {
          const sectionItems = section.paths.map((path) => itemByPath.get(path)).filter(Boolean) as NavItem[];
          const permittedItems = sectionItems.filter((item) => !item.roles || hasRole(item.roles));
          if (permittedItems.length === 0) return null;

          return (
            <Box key={section.label} sx={{ mb: 0.8 }}>
              {!collapsed && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    px: 2.75,
                    pt: sectionIndex === 0 ? 0.5 : 1,
                    pb: 0.55,
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    letterSpacing: '0.075em',
                    textTransform: 'uppercase',
                  }}
                >
                  {section.label}
                </Typography>
              )}
              {collapsed && sectionIndex > 0 && <Divider sx={{ mx: 2, my: 0.75 }} />}
              <List disablePadding>{permittedItems.map(renderItem)}</List>
            </Box>
          );
        })}
      </Box>

      <Divider />
      <Box sx={{ p: collapsed ? 1 : 1.4 }}>
        {user && !collapsed ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.15,
              p: 1,
              borderRadius: 2.5,
              backgroundColor: (muiTheme) =>
                muiTheme.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(37,99,235,0.035)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Avatar src={user.avatarUrl} sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
              {(user.displayName || user.username || 'A').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {user.displayName || user.username}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.66rem' }}>
                {user.role.replaceAll('_', ' ')}
              </Typography>
            </Box>
            <Tooltip title="Sign out">
              <IconButton size="small" onClick={handleLogout} aria-label="Sign out">
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
            {user && (
              <Tooltip title={user.displayName || user.username} placement="right">
                <Avatar src={user.avatarUrl} sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                  {(user.displayName || user.username || 'A').charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>
            )}
            <Tooltip title="Sign out" placement="right">
              <IconButton size="small" onClick={handleLogout} aria-label="Sign out">
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        {!isMobile && collapsed && (
          <Tooltip title="Expand navigation" placement="right">
            <IconButton size="small" onClick={toggleSidebar} aria-label="Expand navigation" sx={{ mt: 0.75 }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Drawer>
  );
};
