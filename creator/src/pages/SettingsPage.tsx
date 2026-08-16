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
  CircularProgress,
  useTheme,
} from '@mui/material';
import { Volume2, Shield, Bell, Save } from 'lucide-react';
import { creatorApi } from '../services/creator-api.service';

export const SettingsPage: React.FC = () => {
  const theme = useTheme();
  const [audioPreset, setAudioPreset] = useState('324');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [micQueue, setMicQueue] = useState(true);
  const [toxicityFilter, setToxicityFilter] = useState(true);
  const [followersOnlyChat, setFollowersOnlyChat] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);
    void creatorApi
      .getStudioSettings()
      .then((settings) => {
        if (!isMounted || !settings) return;
        if (settings.audioPreset) setAudioPreset(settings.audioPreset);
        if (typeof settings.noiseSuppression === 'boolean')
          setNoiseSuppression(settings.noiseSuppression);
        if (typeof settings.micQueue === 'boolean')
          setMicQueue(settings.micQueue);
        if (typeof settings.toxicityFilter === 'boolean')
          setToxicityFilter(settings.toxicityFilter);
        if (typeof settings.followersOnlyChat === 'boolean')
          setFollowersOnlyChat(settings.followersOnlyChat);
        if (typeof settings.emailAlerts === 'boolean')
          setEmailAlerts(settings.emailAlerts);
      })
      .catch((error: Error) => {
        if (isMounted) {
          setLoadError(
            error?.message || 'Studio settings could not be loaded from the server.',
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
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
    } catch (error) {
      setIsSaved(false);
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Studio preferences could not be saved to the server.',
      );
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
          Configure creator preferences, audio presets, auto-moderation
          thresholds, and notification alerts.
        </Typography>
      </Box>

      {isSaved && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Studio preferences updated successfully!
        </Alert>
      )}

      {loadError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Settings could not be loaded: {loadError}
        </Alert>
      )}

      {saveError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Settings were not saved: {saveError}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* Audio & RTC */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Volume2 size={20} color={theme.palette.primary.main} /> Audio & RTC
            Preferences
          </Typography>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Default Audio Preset</InputLabel>
              <Select
                value={audioPreset}
                onChange={(e) => setAudioPreset(e.target.value)}
                label="Default Audio Preset"
              >
                <MenuItem value="324">
                  324kbps Ultra HD Voice (Music & Lounge)
                </MenuItem>
                <MenuItem value="256">
                  256kbps High Definition Voice (Podcast)
                </MenuItem>
                <MenuItem value="128">
                  128kbps Standard Voice (Talk Show)
                </MenuItem>
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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Shield size={20} color={theme.palette.info.main} /> Chat &
            Auto-Moderation Shield
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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Bell size={20} color={theme.palette.warning.main} /> Email & In-App
            Alerts
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
              startIcon={
                isSaving ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Save size={18} />
                )
              }
              onClick={() => {
                void handleSave();
              }}
              disabled={isSaving || isLoading || Boolean(loadError)}
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
