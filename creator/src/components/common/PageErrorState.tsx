import React from 'react';
import { Box, Alert, AlertTitle, Button } from '@mui/material';
import { RotateCcw } from 'lucide-react';

interface PageErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const PageErrorState: React.FC<PageErrorStateProps> = ({
  title = 'Failed to Load Data',
  message = 'An error occurred while communicating with the backend service. Please check your connection and try again.',
  onRetry,
}) => {
  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto', my: 3 }}>
      <Alert
        severity="error"
        sx={{ borderRadius: 3, p: 2.5 }}
        action={
          onRetry && (
            <Button
              color="inherit"
              size="medium"
              startIcon={<RotateCcw size={16} />}
              onClick={onRetry}
              sx={{ fontWeight: 700, alignSelf: 'center' }}
            >
              Retry
            </Button>
          )
        }
      >
        <AlertTitle sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{title}</AlertTitle>
        {message}
      </Alert>
    </Box>
  );
};
