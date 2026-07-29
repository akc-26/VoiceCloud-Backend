import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
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
        <FindInPageIcon color="primary" sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800 }} gutterBottom>
          404 - Page Not Found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          The requested administrative view or route does not exist or has been moved to another path.
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
