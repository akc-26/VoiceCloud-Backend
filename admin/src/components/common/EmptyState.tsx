import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  description = 'There are no items matching your criteria or currently available in the database.',
  actionText,
  onAction,
  icon = <InboxOutlinedIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.7 }} />,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 6,
        textAlign: 'center',
        borderRadius: 3,
        border: '1px border',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 280,
      }}
    >
      <Box sx={{ mb: 2 }}>{icon}</Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mb: 3 }}>
        {description}
      </Typography>
      {actionText && onAction && (
        <Button variant="contained" color="primary" size="medium" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Paper>
  );
};
