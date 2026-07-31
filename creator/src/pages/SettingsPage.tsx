import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  TextField,
  IconButton,
  Tooltip,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Settings, Volume2, Shield, Bell, Save, Radio, Copy, Eye, EyeOff, RefreshCw, Check } from 'lucide-react';
import { creatorApi } from '../services/creator-api.service';

export const SettingsPage: React.FC = () => {
  const [audioPreset, setAudioPreset] = useState('324');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [micQueue, setMicQueue] = useState(true);
  const [toxicityFilter, setToxicityFilter] = useState(true);
  const [followersOnlyChat, setFollowersOnlyChat] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Streaming Configuration State
  const [rtmpUrl, setRtmpUrl] = useState('rtmps://live.voicecloud.app:443/live');
  const [streamKey, setStreamKey] = useState('live_vc_sk_8f93a1200bc4291e');
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    creatorApi.getStreamCredentials().then((creds) => {
      if (isMounted && creds) {
        if (creds.rtmpUrl) setRtmpUrl(creds.rtmpUrl);
        if (creds.streamKey) setStreamKey(creds.streamKey);
      }
    });
    creatorApi.getStudioSettings().then((settings) => {
      if (isMounted && settings) {
        if (settings.audioPreset) setAudioPreset(settings.audioPreset);
        if (typeof settings.noiseSuppression === 'boolean') setNoiseSuppression(settings.noiseSuppression);
        if (typeof settings.micQueue === 'boolean') setMicQueue(settings.micQueue);
        if (typeof settings.toxicityFilter === 'boolean') setToxicityFilter(settings.toxicityFilter);
        if (typeof settings.followersOnlyChat === 'boolean') setFollowersOnlyChat(settings.followersOnlyChat);
        if (typeof settings.emailAlerts === 'boolean') setEmailAlerts(settings.emailAlerts);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(rtmpUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(streamKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = async () => {
    setIsRegenerating(true);
    try {
      const res = await creatorApi.regenerateStreamKey();
      if (res && res.streamKey) {
        setStreamKey(res.streamKey);
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await creatorApi.updateStudioSettings({
        audioPreset,
        noiseSuppression,
        micQueue,
        toxicityFilter,
        followersOnlyChat,
        emailAlerts,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Studio Settings & Audio Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure high-fidelity audio parameters, RTMP ingest stream keys, auto-moderation thresholds, and preferences.
        </Typography>
      </Box>

      {isSaved && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Studio preferences updated successfully!
        </Alert>
      )}

      {/* Streaming Credentials Card */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Radio size={20} color="#dc2626" /> RTMP & WebRTC Stream Ingest Credentials
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Use these credentials in OBS Studio, Streamlabs, or hardware encoders for high-bitrate live audio broadcasting.
          </Typography>

          <Grid container spacing={2}>
            <Grid xs={12} md={6}>
              <TextField
                label="RTMP Ingest Server URL"
                value={rtmpUrl}
                fullWidth
                size="small"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <Tooltip title={copiedUrl ? 'Copied!' : 'Copy RTMP URL'}>
                      <IconButton onClick={handleCopyUrl} size="small" edge="end">
                        {copiedUrl ? <Check size={18} color="#16a34a" /> : <Copy size={18} />}
                      </IconButton>
                    </Tooltip>
                  ),
                }}
              />
            </Grid>

            <Grid xs={12} md={6}>
              <TextField
                label="Stream Ingest Key (Secret)"
                type={showStreamKey ? 'text' : 'password'}
                value={streamKey}
                fullWidth
                size="small"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title={showStreamKey ? 'Hide Stream Key' : 'Show Stream Key'}>
                        <IconButton onClick={() => setShowStreamKey(!showStreamKey)} size="small">
                          {showStreamKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={copiedKey ? 'Copied!' : 'Copy Stream Key'}>
                        <IconButton onClick={handleCopyKey} size="small">
                          {copiedKey ? <Check size={18} color="#16a34a" /> : <Copy size={18} />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">
              Keep your stream key private. If compromised, regenerate it immediately.
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              size="small"
              startIcon={isRegenerating ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
              onClick={handleRegenerateKey}
              disabled={isRegenerating}
            >
              Regenerate Key
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* Audio & RTC */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Volume2 size={20} color="#7c3aed" /> Audio & RTC Streaming Settings
          </Typography>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Default Audio Preset</InputLabel>
              <Select
                value={audioPreset}
                onChange={(e) => setAudioPreset(e.target.value)}
                label="Default Audio Preset"
              >
                <MenuItem value="324">324kbps Ultra HD Voice (Music & Lounge)</MenuItem>
                <MenuItem value="256">256kbps High Definition Voice (Podcast)</MenuItem>
                <MenuItem value="128">128kbps Standard Voice (Talk Show)</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={noiseSuppression}
                  onChange={(e) => setNoiseSuppression(e.target.checked)}
                  color="primary"
                />
              }
              label="Enable AI Noise Suppression & Echo Cancellation"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={micQueue}
                  onChange={(e) => setMicQueue(e.target.checked)}
                  color="primary"
                />
              }
              label="Allow Co-Host Mic Request Queue in Live Rooms"
            />
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* Chat & Auto Moderation */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Shield size={20} color="#2563eb" /> Chat & Auto-Moderation Shield
          </Typography>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={toxicityFilter}
                  onChange={(e) => setToxicityFilter(e.target.checked)}
                  color="primary"
                />
              }
              label="Enable Automated Toxicity Filtering in Chat"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={followersOnlyChat}
                  onChange={(e) => setFollowersOnlyChat(e.target.checked)}
                  color="primary"
                />
              }
              label="Restrict Chat to Followers & Subscribers Only"
            />
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* Notifications */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bell size={20} color="#d97706" /> Email & In-App Alerts
          </Typography>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  color="primary"
                />
              }
              label="Receive Email Summaries for New Subscribers and Payout Updates"
            />
          </Stack>

          <Box sx={{ mt: 3.5 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
              onClick={handleSave}
              disabled={isSaving}
              sx={{ fontWeight: 700 }}
            >
              {isSaving ? 'Saving...' : 'Save Studio Preferences'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
