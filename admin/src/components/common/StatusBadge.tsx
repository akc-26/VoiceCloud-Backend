import React from 'react';
import { alpha, Chip, ChipProps, useTheme } from '@mui/material';

export type StatusType =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'banned'
  | 'suspended'
  | 'completed'
  | 'failed'
  | 'success'
  | 'warning'
  | 'danger'
  | 'live'
  | 'offline'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: ChipProps['size'];
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'small' }) => {
  const theme = useTheme();
  const normalized = String(status).toLowerCase();
  const displayLabel = label || String(status).replaceAll('_', ' ');

  let semantic: 'success' | 'warning' | 'error' | 'info' | 'default' = 'info';

  switch (normalized) {
    case 'active':
    case 'success':
    case 'completed':
    case 'live':
    case 'published':
    case 'enabled':
    case 'connected':
    case 'healthy':
      semantic = 'success';
      break;
    case 'pending':
    case 'warning':
    case 'in_progress':
    case 'review':
    case 'degraded':
      semantic = 'warning';
      break;
    case 'banned':
    case 'suspended':
    case 'failed':
    case 'danger':
    case 'error':
    case 'closed':
    case 'disabled':
    case 'disconnected':
    case 'unhealthy':
      semantic = 'error';
      break;
    case 'inactive':
    case 'offline':
    case 'draft':
    case 'not_tested':
      semantic = 'default';
      break;
    default:
      semantic = 'info';
  }

  const paletteColor = semantic === 'default' ? theme.palette.text.secondary : theme.palette[semantic].main;

  return (
    <Chip
      label={displayLabel}
      size={size}
      variant="outlined"
      sx={{
        textTransform: 'capitalize',
        color: paletteColor,
        borderColor: alpha(paletteColor, 0.22),
        backgroundColor: alpha(paletteColor, theme.palette.mode === 'dark' ? 0.13 : 0.075),
        '&::before': {
          content: '""',
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: paletteColor,
          ml: 0.2,
          mr: -0.2,
        },
      }}
    />
  );
};
