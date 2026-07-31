import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  Chip,
  Paper,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import RadioIcon from '@mui/icons-material/Radio';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';

import { useNotificationsStore } from '../store/notifications.store';
import { adminService } from '../services/admin.service';

export const SystemSettingsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  // Core System Settings State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxSpeakers, setMaxSpeakers] = useState('12');
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState('24');

  // Streaming Infrastructure State (Admin Managed)
  const [streamingProvider, setStreamingProvider] = useState('mediamtx');
  const [rtmpUrl, setRtmpUrl] = useState('rtmps://live.voicecloud.app:443/live');
  const [webrtcUrl, setWebrtcUrl] = useState('wss://webrtc.voicecloud.app:443/v1');
  const [turnStunServers, setTurnStunServers] = useState('turn:turn.voicecloud.app:3478, stun:stun.l.google.com:19302');
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [lowLatencyMode, setLowLatencyMode] = useState(true);
  const [defaultBitrate, setDefaultBitrate] = useState('324');
  const [codec, setCodec] = useState('opus');
  const [region, setRegion] = useState('us-east');
  const [streamKeyPolicy, setStreamKeyPolicy] = useState('auto_rotate_90d');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adminService.getSystemSettings().then((settings) => {
      if (isMounted && Array.isArray(settings)) {
        settings.forEach((item) => {
          if (item.key === 'maintenance_mode') setMaintenanceMode(item.value === 'true');
          if (item.key === 'max_speaker_seats') setMaxSpeakers(String(item.value));
          if (item.key === 'streaming_provider') setStreamingProvider(String(item.value));
          if (item.key === 'rtmp_server_url') setRtmpUrl(String(item.value));
          if (item.key === 'webrtc_server_url') setWebrtcUrl(String(item.value));
          if (item.key === 'turn_stun_servers') setTurnStunServers(String(item.value));
          if (item.key === 'recording_enabled') setRecordingEnabled(item.value === 'true');
          if (item.key === 'low_latency_mode') setLowLatencyMode(item.value === 'true');
          if (item.key === 'default_bitrate') setDefaultBitrate(String(item.value));
          if (item.key === 'codec') setCodec(String(item.value));
          if (item.key === 'region') setRegion(String(item.value));
          if (item.key === 'stream_key_policy') setStreamKeyPolicy(String(item.value));
        });
      }
    }).catch(() => {
      // Fallback silently if unseeded
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        adminService.updateSystemSetting('maintenance_mode', maintenanceMode).catch(() => {}),
        adminService.updateSystemSetting('max_speaker_seats', maxSpeakers).catch(() => {}),
        adminService.updateSystemSetting('streaming_provider', streamingProvider).catch(() => {}),
        adminService.updateSystemSetting('rtmp_server_url', rtmpUrl).catch(() => {}),
        adminService.updateSystemSetting('webrtc_server_url', webrtcUrl).catch(() => {}),
        adminService.updateSystemSetting('turn_stun_servers', turnStunServers).catch(() => {}),
        adminService.updateSystemSetting('recording_enabled', recordingEnabled).catch(() => {}),
        adminService.updateSystemSetting('low_latency_mode', lowLatencyMode).catch(() => {}),
        adminService.updateSystemSetting('default_bitrate', defaultBitrate).catch(() => {}),
        adminService.updateSystemSetting('codec', codec).catch(() => {}),
        adminService.updateSystemSetting('region', region).catch(() => {}),
        adminService.updateSystemSetting('stream_key_policy', streamKeyPolicy).catch(() => {}),
      ]);
      addToast('success', 'System and Streaming Infrastructure settings updated successfully');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Platform Settings & Streaming Infrastructure
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure core operating thresholds, emergency locks, and administrator-managed streaming media servers.
        </Typography>
      </Box>

      {/* Global Operating Settings */}
      <Card elevation={0} sx={{ p: 1 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" /> Global Operating Thresholds & Security
          </Typography>
          <Grid container spacing={3}>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={maintenanceMode}
                    onChange={(e) => setMaintenanceMode(e.target.checked)}
                    color="error"
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Emergency Maintenance Mode
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Block new guest logins and voice room creation during system updates
                    </Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Maximum Speaker Seats Per Voice Room"
                type="number"
                value={maxSpeakers}
                onChange={(e) => setMaxSpeakers(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Admin Session Timeout (Hours)"
                type="number"
                value={sessionTimeoutHours}
                onChange={(e) => setSessionTimeoutHours(e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Administrator-Managed Streaming Infrastructure */}
      <Card elevation={0} sx={{ p: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <RadioIcon color="secondary" /> Streaming Infrastructure & Media Server Configuration
            </Typography>
            <Chip label="Admin Restricted" color="primary" size="small" variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            All RTMP, WebRTC, and media ingest servers are centrally controlled by administrators. Creators operate exclusively through automated room provisioning.
          </Typography>

          <Grid container spacing={2.5}>
            {/* Provider & Region */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Active Streaming Provider</InputLabel>
                <Select
                  value={streamingProvider}
                  onChange={(e) => setStreamingProvider(e.target.value)}
                  label="Active Streaming Provider"
                >
                  <MenuItem value="mediamtx">MediaMTX (High-Throughput Native RTMP/WebRTC)</MenuItem>
                  <MenuItem value="livekit">LiveKit Cloud Engine</MenuItem>
                  <MenuItem value="antmedia">Ant Media Enterprise</MenuItem>
                  <MenuItem value="agora">Agora Interactive Voice Engine</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Edge Ingest Region</InputLabel>
                <Select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  label="Edge Ingest Region"
                >
                  <MenuItem value="us-east">US-East (Virginia)</MenuItem>
                  <MenuItem value="us-west">US-West (Oregon)</MenuItem>
                  <MenuItem value="eu-central">EU-Central (Frankfurt)</MenuItem>
                  <MenuItem value="ap-south">AP-South (Singapore)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Server Endpoints */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="RTMP Ingest Server URL"
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                helperText="Primary RTMP ingest gateway for broadcast encoders"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="WebRTC Gateway URL"
                value={webrtcUrl}
                onChange={(e) => setWebrtcUrl(e.target.value)}
                helperText="Sub-second low-latency WebRTC signaling gateway"
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="TURN / STUN Relay Servers"
                value={turnStunServers}
                onChange={(e) => setTurnStunServers(e.target.value)}
                helperText="Comma-separated NAT traversal TURN/STUN URIs"
              />
            </Grid>

            {/* Codec & Quality Policies */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Default Bitrate</InputLabel>
                <Select
                  value={defaultBitrate}
                  onChange={(e) => setDefaultBitrate(e.target.value)}
                  label="Default Bitrate"
                >
                  <MenuItem value="324">324kbps Ultra HD Voice</MenuItem>
                  <MenuItem value="256">256kbps High Definition</MenuItem>
                  <MenuItem value="128">128kbps Standard Voice</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Audio Codec</InputLabel>
                <Select
                  value={codec}
                  onChange={(e) => setCodec(e.target.value)}
                  label="Audio Codec"
                >
                  <MenuItem value="opus">OPUS (Adaptive Interactive)</MenuItem>
                  <MenuItem value="aac">AAC-LC (Broadcast Standard)</MenuItem>
                  <MenuItem value="lc3">LC3 (Bluetooth Low Energy)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Stream Key Rotation Policy</InputLabel>
                <Select
                  value={streamKeyPolicy}
                  onChange={(e) => setStreamKeyPolicy(e.target.value)}
                  label="Stream Key Rotation Policy"
                >
                  <MenuItem value="auto_rotate_90d">Auto-rotate key every 90 days</MenuItem>
                  <MenuItem value="auto_rotate_30d">Auto-rotate key every 30 days</MenuItem>
                  <MenuItem value="per_session">Per-session ephemeral key generation</MenuItem>
                  <MenuItem value="manual">Manual administrator rotation only</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={recordingEnabled}
                    onChange={(e) => setRecordingEnabled(e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable Automated Live Stream Cloud Recording"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={lowLatencyMode}
                    onChange={(e) => setLowLatencyMode(e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable Ultra Low-Latency Mode (<500ms Glass-to-Glass)"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saving}
              sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}
            >
              {saving ? 'Saving...' : 'Apply System & Infrastructure Settings'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

