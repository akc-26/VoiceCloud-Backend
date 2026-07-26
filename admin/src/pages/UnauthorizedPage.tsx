import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { useNavigate } from 'react-router-dom';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 6,
          textAlign: 'center',
          maxWidth: 480,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <BlockIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h5" fontWeight={800} gutterBottom>
          403 - Unauthorized Access
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          You do not have the necessary security permissions or administrative role to access this module. If you believe this is an error, contact your Super Admin.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/dashboard')}
          sx={{ borderRadius: 2, px: 3 }}
        >
          Return to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};
