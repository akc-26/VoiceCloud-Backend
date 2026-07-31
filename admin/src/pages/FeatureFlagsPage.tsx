import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Switch, FormControlLabel, Grid, Chip } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';

import { useNotificationsStore } from '../store/notifications.store';

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  category: string;
}

export const FeatureFlagsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [flags, setFlags] = useState<FeatureFlag[]>([
    { key: 'enable_ai_noise_cancelling', name: 'AI Noise Suppression', description: 'Enable real-time AI audio background noise filter for voice rooms', isEnabled: true, category: 'Audio RTC' },
    { key: 'enable_gift_svga_animations', name: 'SVGA Gift Animations', description: 'Render high-framerate vector animations for luxury room gifts', isEnabled: true, category: 'Economy' },
    { key: 'enable_host_agencies', name: 'Host Agency Guilds', description: 'Allow talent agencies to sign verified hosts and take revenue cuts', isEnabled: true, category: 'Talent' },
    { key: 'enable_registration', name: 'New User Registration', description: 'Allow new guest account registration and phone auth signup', isEnabled: true, category: 'Auth' },
  ]);

  const handleToggle = (key: string, current: boolean) => {
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, isEnabled: !current } : f)));
    addToast('info', `Toggled feature flag "${key}" to ${!current ? 'ENABLED' : 'DISABLED'}`);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Feature Flag Control Console</Typography>
        <Typography variant="body2" color="text.secondary">Dynamically toggle platform modules, experimental voice features, and emergency kill switches</Typography>
      </Box>

      <Grid container spacing={2.5}>
        {flags.map((flag) => (
          <Grid size={{ xs: 12, md: 6 }} key={flag.key}>
            <Card elevation={0}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FlagIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{flag.name}</Typography>
                  </Box>
                  <Chip label={flag.category} size="small" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {flag.description}
                </Typography>
                <FormControlLabel
                  control={<Switch checked={flag.isEnabled} onChange={() => handleToggle(flag.key, flag.isEnabled)} color="primary" />}
                  label={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{flag.isEnabled ? 'Active (ENABLED)' : 'Disabled'}</Typography>}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
