import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuthStore } from '../../store/auth.store';

export const UserDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleClose = () => setAnchorEl(null);

  const handleNavigate = (path: string) => {
    handleClose();
    navigate(path);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const displayName = user.displayName || user.username;
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.9,
          border: 0,
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          p: 0.35,
          borderRadius: 2,
          font: 'inherit',
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        <Avatar src={user.avatarUrl} alt={displayName} sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.75rem', fontWeight: 700 }}>
          {initials || 'A'}
        </Avatar>
        <Box sx={{ display: { xs: 'none', lg: 'block' }, textAlign: 'left', maxWidth: 140 }}>
          <Typography variant="subtitle2" noWrap sx={{ lineHeight: 1.2 }}>
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', lineHeight: 1.2, mt: 0.25 }}>
            {user.role.replaceAll('_', ' ')}
          </Typography>
        </Box>
        <ExpandMoreIcon sx={{ display: { xs: 'none', lg: 'block' }, fontSize: 17, color: 'text.secondary' }} />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { width: 250, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {displayName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.35 }}>
            {user.email}
          </Typography>
          <Chip label={user.role.replaceAll('_', ' ')} size="small" color="primary" sx={{ mt: 1 }} />
        </Box>
        <Divider sx={{ my: 0.75 }} />
        <MenuItem onClick={() => handleNavigate('/profile')}>
          <ListItemIcon><PersonOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="My Profile" />
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/system-settings')}>
          <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="System Settings" />
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/audit-logs')}>
          <ListItemIcon><SecurityOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Audit Logs" />
        </MenuItem>
        <Divider sx={{ my: 0.75 }} />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon><LogoutOutlinedIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText primary="Sign out" />
        </MenuItem>
      </Menu>
    </Box>
  );
};
