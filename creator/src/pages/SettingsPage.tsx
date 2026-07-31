import React from 'react';
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
} from '@mui/material';
import { Settings, Volume2, Shield, Bell, Radio } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Studio Settings & Audio Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure high-fidelity audio parameters, auto-moderation thresholds, and stream preferences.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Audio & RTC Streaming Settings
          </Typography>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Default Audio Preset</InputLabel>
              <Select defaultValue="324" label="Default Audio Preset">
                <MenuItem value="324">324kbps Ultra HD Voice (Music & Lounge)</MenuItem>
                <MenuItem value="256">256kbps High Definition Voice (Podcast)</MenuItem>
                <MenuItem value="128">128kbps Standard Voice (Talk Show)</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label="Enable AI Noise Suppression & Echo Cancellation"
            />
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label="Allow Co-Host Mic Request Queue in Live Rooms"
            />
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Chat & Auto-Moderation Shield
          </Typography>
          <Stack spacing={2}>
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label="Enable Automated Toxicity Filtering in Chat"
            />
            <FormControlLabel
              control={<Switch defaultChecked color="primary" />}
              label="Restrict Chat to Followers & Subscribers Only"
            />
          </Stack>

          <Box sx={{ mt: 3 }}>
            <Button variant="contained" color="primary">
              Save Studio Preferences
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
