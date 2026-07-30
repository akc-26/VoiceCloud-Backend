import React from 'react';
import { Chip, ChipProps } from '@mui/material';

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

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'small',
}) => {
  const normalized = String(status).toLowerCase();
  const displayLabel = label || status;

  let color: ChipProps['color'] = 'default';
  let variant: ChipProps['variant'] = 'filled';

  switch (normalized) {
    case 'active':
    case 'success':
    case 'completed':
    case 'live':
    case 'published':
    case 'enabled':
      color = 'success';
      break;
    case 'pending':
    case 'warning':
    case 'in_progress':
    case 'review':
      color = 'warning';
      break;
    case 'banned':
    case 'suspended':
    case 'failed':
    case 'danger':
    case 'error':
    case 'closed':
    case 'disabled':
      color = 'error';
      break;
    case 'inactive':
    case 'offline':
    case 'draft':
      color = 'default';
      break;
    default:
      color = 'info';
      break;
  }

  return (
    <Chip
      label={displayLabel}
      color={color}
      size={size}
      variant={variant}
      sx={{
        textTransform: 'capitalize',
        fontWeight: 600,
        fontSize: '0.75rem',
      }}
    />
  );
};
