import React from 'react';
import { alpha, Box, Button, Paper, Typography, useTheme } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no records to display for the current view.',
  actionText,
  onAction,
  icon,
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 4, md: 5 },
        textAlign: 'center',
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 250,
      }}
    >
      <Box
        sx={{
          width: 54,
          height: 54,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 3,
          bgcolor: alpha(
            theme.palette.primary.main,
            theme.palette.mode === 'dark' ? 0.14 : 0.07,
          ),
          color: 'primary.main',
          mb: 1.5,
        }}
      >
        {icon || <InboxOutlinedIcon sx={{ fontSize: 28 }} />}
      </Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 430, mb: actionText ? 2.5 : 0 }}
      >
        {description}
      </Typography>
      {actionText && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Paper>
  );
};
