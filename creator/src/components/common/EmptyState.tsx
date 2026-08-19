import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 5,
        textAlign: 'center',
        bgcolor: 'action.hover',
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ color: 'text.secondary', mb: 2 }}>
        {icon || <Inbox size={48} strokeWidth={1.5} />}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mb: actionLabel ? 2.5 : 0 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" color="primary" onClick={onAction} sx={{ fontWeight: 700 }}>
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
};
