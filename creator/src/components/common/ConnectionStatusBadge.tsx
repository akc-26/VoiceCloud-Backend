import React from 'react';
import { Box, Chip, Tooltip, useTheme } from '@mui/material';
import { useSocket, SocketConnectionStatus } from '../../hooks/useSocket';

interface ConnectionStatusBadgeProps {
  size?: 'small' | 'medium';
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  size = 'small',
}) => {
  const { status } = useSocket();
  const theme = useTheme();

  const getStatusConfig = (connectionStatus: SocketConnectionStatus) => {
    switch (connectionStatus) {
      case 'connected':
        return {
          label: 'Connected',
          color: theme.palette.success.main,
          bgcolor: 'rgba(22, 163, 74, 0.12)',
          borderColor: 'rgba(22, 163, 74, 0.28)',
          tooltip: 'Realtime socket connected',
        };
      case 'connecting':
        return {
          label: 'Connecting',
          color: theme.palette.warning.main,
          bgcolor: 'rgba(217, 119, 6, 0.12)',
          borderColor: 'rgba(217, 119, 6, 0.28)',
          tooltip: 'Connecting to realtime services',
        };
      case 'reconnecting':
        return {
          label: 'Reconnecting',
          color: theme.palette.warning.main,
          bgcolor: 'rgba(217, 119, 6, 0.12)',
          borderColor: 'rgba(217, 119, 6, 0.28)',
          tooltip: 'Reconnecting to realtime services',
        };
      case 'offline':
      default:
        return {
          label: 'Offline',
          color: theme.palette.error.main,
          bgcolor: 'rgba(220, 38, 38, 0.12)',
          borderColor: 'rgba(220, 38, 38, 0.28)',
          tooltip: 'Realtime socket offline; REST services remain available',
        };
    }
  };

  const config = getStatusConfig(status);
  const isTransitioning = status === 'connecting' || status === 'reconnecting';

  return (
    <Tooltip title={config.tooltip} arrow>
      <Chip
        size={size}
        variant="outlined"
        icon={
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: config.color,
              ml: 1,
              boxShadow:
                status === 'connected' ? `0 0 8px ${config.color}` : 'none',
              animation: isTransitioning
                ? 'creator-status-pulse 1.6s ease-in-out infinite'
                : 'none',
              '@keyframes creator-status-pulse': {
                '0%, 100%': { opacity: 0.45 },
                '50%': { opacity: 1 },
              },
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
          />
        }
        label={config.label}
        sx={{
          height: 26,
          px: 0.25,
          fontWeight: 700,
          fontSize: '0.6875rem',
          color: config.color,
          bgcolor: config.bgcolor,
          borderColor: config.borderColor,
        }}
      />
    </Tooltip>
  );
};
