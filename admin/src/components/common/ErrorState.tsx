import React from 'react';
import { alpha, Box, Button, Paper, Typography, useTheme } from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'The requested data could not be loaded. Check the connection and try again.',
  onRetry,
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 4, md: 5 },
        textAlign: 'center',
        border: '1px solid',
        borderColor: alpha(theme.palette.error.main, 0.2),
        backgroundColor: alpha(
          theme.palette.error.main,
          theme.palette.mode === 'dark' ? 0.08 : 0.035,
        ),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 240,
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: 54,
          height: 54,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 3,
          bgcolor: alpha(theme.palette.error.main, 0.1),
          color: 'error.main',
          mb: 1.5,
        }}
      >
        <ErrorOutlineRoundedIcon sx={{ fontSize: 29 }} />
      </Box>
      <Typography variant="h6" color="error.main" gutterBottom>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 460, mb: onRetry ? 2.5 : 0 }}
      >
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant="contained"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </Paper>
  );
};
