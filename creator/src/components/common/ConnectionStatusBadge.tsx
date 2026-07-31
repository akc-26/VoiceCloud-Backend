import React from 'react';
import { Chip, Box, Tooltip } from '@mui/material';
import { useSocket, SocketConnectionStatus } from '../../hooks/useSocket';

interface ConnectionStatusBadgeProps {
  size?: 'small' | 'medium';
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({ size = 'small' }) => {
  const { status } = useSocket();

  const getStatusConfig = (s: SocketConnectionStatus) => {
    switch (s) {
      case 'connected':
        return {
          label: 'Connected',
          color: '#10b981', // green
          bgcolor: 'rgba(16, 185, 129, 0.12)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          tooltip: 'Realtime Socket Connected (/creator)',
        };
      case 'connecting':
        return {
          label: 'Connecting',
          color: '#eab308', // yellow
          bgcolor: 'rgba(234, 179, 8, 0.12)',
          borderColor: 'rgba(234, 179, 8, 0.3)',
          tooltip: 'Connecting to Realtime Gateway...',
        };
      case 'reconnecting':
        return {
          label: 'Reconnecting',
          color: '#f97316', // orange
          bgcolor: 'rgba(249, 115, 22, 0.12)',
          borderColor: 'rgba(249, 115, 22, 0.3)',
          tooltip: 'Attempting to reconnect with exponential backoff...',
        };
      case 'offline':
      default:
        return {
          label: 'Offline',
          color: '#ef4444', // red
          bgcolor: 'rgba(239, 68, 68, 0.12)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          tooltip: 'Realtime socket offline. REST API mode active.',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Tooltip title={config.tooltip} arrow>
      <Chip
        size={size}
        variant="outlined"
        icon={
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: config.color,
              ml: 1,
              boxShadow: status === 'connected' ? `0 0 6px ${config.color}` : 'none',
              animation: status === 'connecting' || status === 'reconnecting' ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 0.4 },
                '50%': { opacity: 1 },
                '100%': { opacity: 0.4 },
              },
            }}
          />
        }
        label={config.label}
        sx={{
          fontWeight: 700,
          fontSize: '0.75rem',
          color: config.color,
          bgcolor: config.bgcolor,
          borderColor: config.borderColor,
          height: 26,
          px: 0.5,
        }}
      />
    </Tooltip>
  );
};
