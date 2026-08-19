import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  adminService,
  StreamingInfrastructureSettings,
  UpdateStreamingInfrastructureSettings,
} from '../../services/admin.service';
import { useNotificationsStore } from '../../store/notifications.store';

export const StreamingInfrastructureSettingsCard: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [settings, setSettings] =
    useState<StreamingInfrastructureSettings | null>(null);
  const [turnServers, setTurnServers] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await adminService.getStreamingInfrastructureSettings();
      setSettings(loaded);
      setTurnServers(loaded.turnStunServers.join(', '));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load streaming infrastructure settings',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const update = <K extends keyof StreamingInfrastructureSettings>(
    key: K,
    value: StreamingInfrastructureSettings[K],
  ) => {
    setSettings((current) =>
      current ? { ...current, [key]: value } : current,
    );
  };

  const save = async () => {
    if (!settings) return;
    const parsedTurnServers = turnServers
      .split(',')
      .map((server) => server.trim())
      .filter(Boolean);
    const payload: UpdateStreamingInfrastructureSettings = {
      provider: settings.provider,
      rtmpUrl: settings.rtmpUrl.trim(),
      webrtcUrl: settings.webrtcUrl.trim(),
      turnStunServers: parsedTurnServers,
      recordingEnabled: settings.recordingEnabled,
      lowLatencyMode: settings.lowLatencyMode,
      defaultBitrate: Number(settings.defaultBitrate),
      codec: settings.codec,
      region: settings.region,
      streamKeyPolicy: settings.streamKeyPolicy,
    };

    if (!/^rtmps?:\/\/\S+$/i.test(payload.rtmpUrl)) {
      setError('Enter a valid RTMP or RTMPS server URL.');
      return;
    }
    if (!/^(?:wss?|webrtc):\/\/\S+$/i.test(payload.webrtcUrl)) {
      setError('Enter a valid WebRTC or WebSocket gateway URL.');
      return;
    }
    if (
      parsedTurnServers.length < 1 ||
      parsedTurnServers.length > 20 ||
      parsedTurnServers.some(
        (server) => !/^(?:turns?|stuns?):\S+$/i.test(server),
      )
    ) {
      setError('Provide 1 to 20 valid comma-separated TURN/STUN URIs.');
      return;
    }
    if (new Set(parsedTurnServers).size !== parsedTurnServers.length) {
      setError('TURN/STUN server URIs must be unique.');
      return;
    }
    if (
      !Number.isInteger(payload.defaultBitrate) ||
      payload.defaultBitrate < 32 ||
      payload.defaultBitrate > 512
    ) {
      setError('Default bitrate must be between 32 and 512 kbps.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated =
        await adminService.updateStreamingInfrastructureSettings(payload);
      setSettings(updated);
      setTurnServers(updated.turnStunServers.join(', '));
      addToast('success', 'Streaming infrastructure settings updated');
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save streaming infrastructure settings';
      setError(message);
      addToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card elevation={0} sx={{ p: 1 }}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Streaming Infrastructure
          </Typography>
          <Chip label="Admin Restricted" size="small" variant="outlined" />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Private media-server configuration used by backend Creator credential
          provisioning. These values are excluded from public configuration.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : settings ? (
          <Grid container spacing={2.5}>
            {error && (
              <Grid size={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Streaming Provider</InputLabel>
                <Select
                  value={settings.provider}
                  label="Streaming Provider"
                  onChange={(event) => update('provider', event.target.value)}
                >
                  <MenuItem value="mediamtx">MediaMTX</MenuItem>
                  <MenuItem value="livekit">LiveKit</MenuItem>
                  <MenuItem value="antmedia">Ant Media</MenuItem>
                  <MenuItem value="agora">Agora</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Region</InputLabel>
                <Select
                  value={settings.region}
                  label="Region"
                  onChange={(event) => update('region', event.target.value)}
                >
                  <MenuItem value="us-east">US East</MenuItem>
                  <MenuItem value="us-west">US West</MenuItem>
                  <MenuItem value="eu-central">EU Central</MenuItem>
                  <MenuItem value="ap-south">AP South</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="RTMP Ingest URL"
                value={settings.rtmpUrl}
                onChange={(event) => update('rtmpUrl', event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="WebRTC Gateway URL"
                value={settings.webrtcUrl}
                onChange={(event) => update('webrtcUrl', event.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="TURN/STUN Servers"
                value={turnServers}
                onChange={(event) => setTurnServers(event.target.value)}
                helperText="Comma-separated TURN/STUN URIs"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Default Bitrate (kbps)"
                value={settings.defaultBitrate}
                onChange={(event) =>
                  update('defaultBitrate', Number(event.target.value))
                }
                slotProps={{ htmlInput: { min: 32, max: 512 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Codec</InputLabel>
                <Select
                  value={settings.codec}
                  label="Codec"
                  onChange={(event) => update('codec', event.target.value)}
                >
                  <MenuItem value="opus">Opus</MenuItem>
                  <MenuItem value="aac">AAC-LC</MenuItem>
                  <MenuItem value="lc3">LC3</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Stream-Key Policy</InputLabel>
                <Select
                  value={settings.streamKeyPolicy}
                  label="Stream-Key Policy"
                  onChange={(event) =>
                    update('streamKeyPolicy', event.target.value)
                  }
                >
                  <MenuItem value="auto_rotate_90d">
                    Rotate every 90 days
                  </MenuItem>
                  <MenuItem value="auto_rotate_30d">
                    Rotate every 30 days
                  </MenuItem>
                  <MenuItem value="per_session">Per-session key</MenuItem>
                  <MenuItem value="manual">Manual rotation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.recordingEnabled}
                    onChange={(event) =>
                      update('recordingEnabled', event.target.checked)
                    }
                  />
                }
                label="Cloud Recording Enabled"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.lowLatencyMode}
                    onChange={(event) =>
                      update('lowLatencyMode', event.target.checked)
                    }
                  />
                }
                label="Low-Latency Mode"
              />
            </Grid>
            <Grid size={12}>
              <Button variant="contained" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Streaming Infrastructure'}
              </Button>
            </Grid>
          </Grid>
        ) : (
          <Alert
            severity="error"
            action={<Button onClick={loadSettings}>Retry</Button>}
          >
            {error || 'Streaming infrastructure settings are unavailable.'}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
