import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'An error occurred while connecting to the backend server. Please check your network connection and try again.',
  onRetry,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 5,
        textAlign: 'center',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'error.light',
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 240,
        justifyContent: 'center',
      }}
    >
      <ErrorOutlinedIcon color="error" sx={{ fontSize: 52, mb: 1.5 }} />
      <Typography variant="h6" sx={{ fontWeight: 700 }} color="error.dark" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 450, mb: 3 }}>
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant="contained"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{ borderRadius: 2 }}
        >
          Retry Connection
        </Button>
      )}
    </Paper>
  );
};
