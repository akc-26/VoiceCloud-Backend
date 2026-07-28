import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Switch, FormControlLabel } from '@mui/material';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

import { useNotificationsStore } from '../store/notifications.store';

export const RtcPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [activeProvider, setActiveProvider] = useState<'agora' | 'livekit' | 'zegocloud'>('agora');
  const [audioCodec, setAudioCodec] = useState('Opus 48kHz HD');

  const handleProviderSwitch = (provider: 'agora' | 'livekit' | 'zegocloud') => {
    setActiveProvider(provider);
    addToast('success', `Switched active RTC engine provider to ${provider.toUpperCase()}`);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>RTC Voice Infrastructure</Typography>
        <Typography variant="body2" color="text.secondary">Configure real-time audio channels, primary RTC vendor fallback, audio codecs, and latency parameters</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ border: activeProvider === 'agora' ? '2px solid #1d4ed8' : '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <GraphicEqIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Agora RTC Engine</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                High-definition voice streaming with sub-200ms ultra-low latency & spatial audio.
              </Typography>
              <Button
                variant={activeProvider === 'agora' ? 'contained' : 'outlined'}
                fullWidth
                onClick={() => handleProviderSwitch('agora')}
              >
                {activeProvider === 'agora' ? 'Active Provider' : 'Switch To Agora'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ border: activeProvider === 'livekit' ? '2px solid #1d4ed8' : '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <SettingsInputComponentIcon color="secondary" sx={{ fontSize: 32 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>LiveKit SFU Server</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Open-source WebRTC media server for scalable multi-speaker voice rooms.
              </Typography>
              <Button
                variant={activeProvider === 'livekit' ? 'contained' : 'outlined'}
                fullWidth
                onClick={() => handleProviderSwitch('livekit')}
              >
                {activeProvider === 'livekit' ? 'Active Provider' : 'Switch To LiveKit'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ border: activeProvider === 'zegocloud' ? '2px solid #1d4ed8' : '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <GraphicEqIcon color="warning" sx={{ fontSize: 32 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>ZegoCloud Voice</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Global real-time audio cloud infrastructure with AI noise suppression.
              </Typography>
              <Button
                variant={activeProvider === 'zegocloud' ? 'contained' : 'outlined'}
                fullWidth
                onClick={() => handleProviderSwitch('zegocloud')}
              >
                {activeProvider === 'zegocloud' ? 'Active Provider' : 'Switch To ZegoCloud'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
