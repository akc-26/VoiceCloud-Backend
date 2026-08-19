import React from 'react';
import { Box, Typography, Link, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { BRAND_CONFIG } from '@shared/branding';

export const CreatorFooter: React.FC = () => (
  <Box
    component="footer"
    sx={{
      py: 2.25,
      px: { xs: 2, sm: 3, lg: 4 },
      mt: 'auto',
      borderTop: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper',
      display: 'flex',
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1.5,
    }}
  >
    <Typography variant="caption" color="text.secondary">
      © 2026 {BRAND_CONFIG.identity.legalName}.{' '}
      <strong>{BRAND_CONFIG.products.creator.workspaceLabel}</strong>
    </Typography>
    <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
      <Link
        component={RouterLink}
        to="/help"
        color="text.secondary"
        variant="caption"
        underline="hover"
      >
        Creator Help
      </Link>
      <Link
        component={RouterLink}
        to="/settings"
        color="text.secondary"
        variant="caption"
        underline="hover"
      >
        Settings
      </Link>
      <Typography
        variant="caption"
        color="success.main"
        sx={{
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
        }}
      >
        <Box
          component="span"
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: 'success.main',
          }}
        />
        Platform Connected
      </Typography>
    </Stack>
  </Box>
);
