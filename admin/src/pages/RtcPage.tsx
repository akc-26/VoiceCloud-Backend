import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import MicIcon from '@mui/icons-material/Mic';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { useNotificationsStore } from '../store/notifications.store';
import {
  adminService,
  ProviderConfigData,
  RtcMonitoringStats,
} from '../services/admin.service';

type SwitchableRtcProvider = 'livekit';

const EMPTY_STATS: RtcMonitoringStats = {
  activeRoomsCount: 0,
  connectedParticipantsCount: 0,
  activeProvider: 'unconfigured',
  providerStatus: 'not_configured',
  averageRtt: null,
  averagePacketLoss: null,
  recordingStatus: 'idle',
  activeRecordingsCount: 0,
  recordingCapability: 'unavailable',
  connectionFailures: null,
  reconnectionCount: null,
  activeSpeakersCount: 0,
  telemetryCompleteness: 'no-data',
  activeSessions: [],
};

export const RtcPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [rtcProviders, setRtcProviders] = useState<ProviderConfigData[]>([]);
  const [stats, setStats] = useState<RtcMonitoringStats>(EMPTY_STATS);
  const [isLoadingProvider, setIsLoadingProvider] = useState(true);
  const [switchingProvider, setSwitchingProvider] = useState<SwitchableRtcProvider | null>(null);

  const activeProvider = stats.activeProvider?.toLowerCase() || 'unconfigured';
  const liveKitProfile = useMemo(
    () => rtcProviders.find((item) => item.providerType.trim().toLowerCase() === 'livekit'),
    [rtcProviders],
  );

  useEffect(() => {
    let cancelled = false;

    const loadRtcState = async () => {
      setIsLoadingProvider(true);
      try {
        const [providers, monitoring] = await Promise.all([
          adminService.getProviderConfigs(),
          adminService.getRtcMonitoringStats(),
        ]);
        if (cancelled) return;
        setRtcProviders(providers.filter((provider) => provider.category === 'rtc'));
        setStats(monitoring);
      } catch (error) {
        if (!cancelled) {
          addToast(
            'error',
            error instanceof Error
              ? error.message
              : 'Failed to load persisted RTC configuration',
          );
        }
      } finally {
        if (!cancelled) setIsLoadingProvider(false);
      }
    };

    void loadRtcState();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const handleLiveKitSwitch = async () => {
    if (activeProvider === 'livekit' || switchingProvider) return;
    if (!liveKitProfile) {
      addToast('error', 'Create a LiveKit RTC provider profile first');
      return;
    }
    if (liveKitProfile.healthStatus !== 'healthy') {
      addToast(
        'error',
        'Test the LiveKit Project URL, API Key, and API Secret successfully before activation',
      );
      return;
    }

    setSwitchingProvider('livekit');
    try {
      await adminService.setActiveProviderConfig(liveKitProfile.id);
      const monitoring = await adminService.getRtcMonitoringStats();
      setRtcProviders((current) =>
        current.map((item) => ({
          ...item,
          isActive: item.id === liveKitProfile.id,
          isEnabled: item.id === liveKitProfile.id ? true : item.isEnabled,
        })),
      );
      setStats(monitoring);
      addToast('success', 'LiveKit is now the active VoiceCloud RTC provider');
    } catch (error) {
      addToast(
        'error',
        error instanceof Error ? error.message : 'Failed to activate LiveKit',
      );
    } finally {
      setSwitchingProvider(null);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Enterprise RTC Voice Infrastructure
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Authoritative LiveKit voice-room runtime, participant state and measured quality telemetry.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        This VoiceCloud build has one operational browser RTC adapter: <strong>LiveKit</strong>.
        Agora and ZEGOCLOUD profiles may be retained for future adapter work, but they cannot be activated
        for Creator Studio or consumer website voice rooms.
      </Alert>

      {stats.providerStatus === 'not_configured' ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No RTC provider is active. Configure LiveKit under Provider Configuration, run the live connection
          test, and then activate it before starting a broadcast.
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <GraphicEqIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">Active RTC Rooms</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.activeRoomsCount}</Typography>
              <Chip size="small" label={activeProvider.toUpperCase()} color={activeProvider === 'livekit' ? 'success' : 'default'} sx={{ mt: 1, fontWeight: 600 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MicIcon color="secondary" />
                <Typography variant="subtitle2" color="text.secondary">Connected Participants</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.connectedParticipantsCount}</Typography>
              <Typography variant="caption" color="text.secondary">{stats.activeSpeakersCount} active speakers</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <NetworkCheckIcon color="info" />
                <Typography variant="subtitle2" color="text.secondary">Measured RTT / Packet Loss</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {stats.averageRtt == null ? '—' : `${stats.averageRtt} ms`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.averagePacketLoss == null ? 'No quality samples yet' : `Loss: ${stats.averagePacketLoss}%`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FiberManualRecordIcon color="action" />
                <Typography variant="subtitle2" color="text.secondary">Active Recordings</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.activeRecordingsCount}</Typography>
              <Chip
                size="small"
                label={stats.activeRecordingsCount > 0 ? 'Recording' : 'Idle'}
                color={stats.activeRecordingsCount > 0 ? 'error' : 'default'}
                sx={{ mt: 1, fontWeight: 600 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>RTC Provider Runtime</Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Agora RTC</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Profile storage exists, but the official server/browser runtime adapter is not implemented in this build.
              </Typography>
              <Button variant="outlined" fullWidth disabled>Runtime Adapter Unavailable</Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ height: '100%', borderWidth: activeProvider === 'livekit' ? 2 : 1, borderColor: activeProvider === 'livekit' ? 'primary.main' : 'divider' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <SettingsInputComponentIcon color="secondary" sx={{ fontSize: 32 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>LiveKit</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Operational VoiceCloud WebRTC provider for Creator Studio and the consumer website.
              </Typography>
              <Chip
                size="small"
                label={liveKitProfile ? `Health: ${liveKitProfile.healthStatus}` : 'Profile not configured'}
                color={liveKitProfile?.healthStatus === 'healthy' ? 'success' : 'warning'}
                sx={{ mb: 2 }}
              />
              <Button
                variant={activeProvider === 'livekit' ? 'contained' : 'outlined'}
                fullWidth
                onClick={() => void handleLiveKitSwitch()}
                disabled={
                  isLoadingProvider ||
                  switchingProvider !== null ||
                  activeProvider === 'livekit' ||
                  !liveKitProfile ||
                  liveKitProfile.healthStatus !== 'healthy'
                }
                startIcon={switchingProvider === 'livekit' ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {activeProvider === 'livekit'
                  ? 'Active Provider'
                  : !liveKitProfile
                    ? 'Configure LiveKit First'
                    : liveKitProfile.healthStatus !== 'healthy'
                      ? 'Test LiveKit First'
                      : 'Activate LiveKit'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>ZEGOCLOUD</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Profile storage exists, but the official server/browser runtime adapter is not implemented in this build.
              </Typography>
              <Button variant="outlined" fullWidth disabled>Runtime Adapter Unavailable</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {stats.recordingCapability === 'egress_adapter_required' ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          LiveKit room audio is operational, but VoiceCloud server-side recording is not configured yet.
          LiveKit recording requires an Egress output/storage adapter; recording actions remain fail-closed until that is configured.
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Active Voice Channels & Runtime State</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Room / Channel ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Host / Speakers</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Participants</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>RTC Provider</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Quality Profile</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Recording</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.activeSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No active RTC sessions. Rows appear only when a real VoiceCloud RTC session is active.
                  </TableCell>
                </TableRow>
              ) : (
                stats.activeSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{session.roomId}</TableCell>
                    <TableCell>{session.hostId} ({session.activeSpeakersCount} speakers)</TableCell>
                    <TableCell>{session.concurrentUsers}</TableCell>
                    <TableCell><Chip size="small" label={session.provider.toUpperCase()} color={session.provider === 'livekit' ? 'primary' : 'default'} /></TableCell>
                    <TableCell>{session.qualityProfile.replaceAll('_', ' ')}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={session.recordingStatus === 'recording' ? 'Recording' : 'Idle'}
                        color={session.recordingStatus === 'recording' ? 'error' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
