import React, { useState } from 'react';
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
} from '@mui/material';
import { Settings, Volume2, Shield, Bell, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [audioPreset, setAudioPreset] = useState('324');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [micQueue, setMicQueue] = useState(true);
  const [toxicityFilter, setToxicityFilter] = useState(true);
  const [followersOnlyChat, setFollowersOnlyChat] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Studio Settings & Audio Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure high-fidelity audio parameters, auto-moderation thresholds, and stream preferences.
        </Typography>
      </Box>

      {isSaved && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Studio preferences updated successfully!
        </Alert>
      )}

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
              startIcon={<Save size={18} />}
              onClick={handleSave}
              sx={{ fontWeight: 700 }}
            >
              Save Studio Preferences
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
