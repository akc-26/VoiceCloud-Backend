import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import MicIcon from '@mui/icons-material/Mic';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';

import { useNotificationsStore } from '../store/notifications.store';

interface RtcStats {
  activeRoomsCount: number;
  connectedParticipantsCount: number;
  activeProvider: string;
  providerStatus: string;
  averageRtt: number;
  averagePacketLoss: number;
  recordingStatus: string;
  activeRecordingsCount: number;
  connectionFailures: number;
  reconnectionCount: number;
  activeSpeakersCount: number;
}

export const RtcPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [activeProvider, setActiveProvider] = useState<'agora' | 'livekit' | 'zegocloud' | 'default_mock'>('agora');
  const [stats, setStats] = useState<RtcStats>({
    activeRoomsCount: 4,
    connectedParticipantsCount: 28,
    activeProvider: 'agora',
    providerStatus: 'operational',
    averageRtt: 38,
    averagePacketLoss: 0.4,
    recordingStatus: 'recording',
    activeRecordingsCount: 2,
    connectionFailures: 0,
    reconnectionCount: 1,
    activeSpeakersCount: 6,
  });

  const handleProviderSwitch = (provider: 'agora' | 'livekit' | 'zegocloud') => {
    setActiveProvider(provider);
    setStats((prev) => ({ ...prev, activeProvider: provider }));
    addToast('success', `Switched active RTC engine provider to ${provider.toUpperCase()}`);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Enterprise RTC Voice Infrastructure
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time audio infrastructure, multi-provider switching (Agora / ZegoCloud / LiveKit), quality metrics & cloud recording controls
        </Typography>
      </Box>

      {/* Monitoring Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ bgcolor: 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <GraphicEqIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">Active RTC Rooms</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.activeRoomsCount}</Typography>
              <Chip size="small" label="Live Channels" color="success" sx={{ mt: 1, fontWeight: 600 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ bgcolor: 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MicIcon color="secondary" />
                <Typography variant="subtitle2" color="text.secondary">Connected Participants</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.connectedParticipantsCount}</Typography>
              <Typography variant="caption" color="text.secondary">{stats.activeSpeakersCount} Active Speakers</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ bgcolor: 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <NetworkCheckIcon color="info" />
                <Typography variant="subtitle2" color="text.secondary">Avg RTT / Packet Loss</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.averageRtt} ms</Typography>
              <Typography variant="caption" color="text.secondary">Loss: {stats.averagePacketLoss}%</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0} sx={{ bgcolor: 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FiberManualRecordIcon color="error" />
                <Typography variant="subtitle2" color="text.secondary">Cloud Recordings</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.activeRecordingsCount}</Typography>
              <Chip size="small" label="Recording Active" color="error" sx={{ mt: 1, fontWeight: 600 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Provider Switcher */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>RTC Provider Abstraction</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ borderWidth: activeProvider === 'agora' ? 2 : 1, borderColor: activeProvider === 'agora' ? 'primary.main' : 'divider' }}>
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
          <Card elevation={0} sx={{ borderWidth: activeProvider === 'livekit' ? 2 : 1, borderColor: activeProvider === 'livekit' ? 'primary.main' : 'divider' }}>
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
          <Card elevation={0} sx={{ borderWidth: activeProvider === 'zegocloud' ? 2 : 1, borderColor: activeProvider === 'zegocloud' ? 'primary.main' : 'divider' }}>
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

      {/* Active Channels & Recording Status Table */}
      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Active Voice Channels & Quality Health</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Room / Channel ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Host / Speakers</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Participants</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>RTC Provider</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Quality Health</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Recording</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>VIP-Voice-Lounge-01</TableCell>
                <TableCell>Host: User_9921 (2 Speakers)</TableCell>
                <TableCell>12 Connected</TableCell>
                <TableCell><Chip size="small" label={activeProvider.toUpperCase()} color="primary" /></TableCell>
                <TableCell><Chip size="small" label="Excellent (RTT 32ms)" color="success" /></TableCell>
                <TableCell><Chip size="small" icon={<FiberManualRecordIcon />} label="Recording" color="error" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Music-Jam-Session</TableCell>
                <TableCell>Host: Artist_007 (4 Speakers)</TableCell>
                <TableCell>16 Connected</TableCell>
                <TableCell><Chip size="small" label={activeProvider.toUpperCase()} color="primary" /></TableCell>
                <TableCell><Chip size="small" label="Good (RTT 45ms)" color="success" /></TableCell>
                <TableCell><Chip size="small" icon={<PauseCircleIcon />} label="Paused" color="warning" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
