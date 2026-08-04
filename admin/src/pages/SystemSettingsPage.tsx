import React from 'react';
import { Box, Typography } from '@mui/material';
import { HostBusinessSettingsCard } from '../components/settings/HostBusinessSettingsCard';
import { OperationalSettingsCard } from '../components/settings/OperationalSettingsCard';
import { StreamingInfrastructureSettingsCard } from '../components/settings/StreamingInfrastructureSettingsCard';

export const SystemSettingsPage: React.FC = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Box sx={{ mb: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 800 }}>
        Platform Settings & Streaming Infrastructure
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Configure validated, backend-authoritative operating thresholds, Host
        business rules, and private media infrastructure.
      </Typography>
    </Box>

    <OperationalSettingsCard />
    <HostBusinessSettingsCard />
    <StreamingInfrastructureSettingsCard />
  </Box>
);
