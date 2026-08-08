import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  adminService,
  OperationalSettings,
  UpdateOperationalSettings,
} from '../../services/admin.service';
import { useNotificationsStore } from '../../store/notifications.store';

export const OperationalSettingsCard: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [settings, setSettings] = useState<OperationalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await adminService.getOperationalSettings());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load operational settings',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const update = <K extends keyof OperationalSettings>(
    key: K,
    value: OperationalSettings[K],
  ) => {
    setSettings((current) =>
      current ? { ...current, [key]: value } : current,
    );
  };

  const save = async () => {
    if (!settings) return;
    const payload: UpdateOperationalSettings = {
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage.trim(),
      maxRoomCapacity: Number(settings.maxRoomCapacity),
      maxSpeakerSeats: Number(settings.maxSpeakerSeats),
    };

    if (!payload.maintenanceMessage) {
      setError('Maintenance message cannot be empty.');
      return;
    }
    if (
      !Number.isInteger(payload.maxRoomCapacity) ||
      payload.maxRoomCapacity < 2 ||
      payload.maxRoomCapacity > 10_000
    ) {
      setError('Maximum room capacity must be between 2 and 10,000.');
      return;
    }
    if (
      !Number.isInteger(payload.maxSpeakerSeats) ||
      payload.maxSpeakerSeats < 1 ||
      payload.maxSpeakerSeats > 100 ||
      payload.maxSpeakerSeats >= payload.maxRoomCapacity
    ) {
      setError(
        'Speaker seats must be between 1 and 100 and below room capacity.',
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      setSettings(await adminService.updateOperationalSettings(payload));
      addToast('success', 'Operational settings updated successfully');
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save operational settings';
      setError(message);
      addToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card elevation={0} sx={{ p: 1 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Global Operating Thresholds
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Backend-authoritative maintenance, audience-capacity, and speaker-seat
          limits.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : settings ? (
          <Grid container spacing={3}>
            {error && (
              <Grid size={12}>
                <Alert severity="error">{error}</Alert>
              </Grid>
            )}
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.maintenanceMode}
                    onChange={(event) =>
                      update('maintenanceMode', event.target.checked)
                    }
                    color="error"
                  />
                }
                label="Emergency Maintenance Mode"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="Maintenance Message"
                value={settings.maintenanceMessage}
                onChange={(event) =>
                  update('maintenanceMessage', event.target.value)
                }
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Maximum Room Capacity"
                value={settings.maxRoomCapacity}
                onChange={(event) =>
                  update('maxRoomCapacity', Number(event.target.value))
                }
                slotProps={{ htmlInput: { min: 2, max: 10_000 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Maximum Speaker Seats"
                value={settings.maxSpeakerSeats}
                onChange={(event) =>
                  update('maxSpeakerSeats', Number(event.target.value))
                }
                slotProps={{ htmlInput: { min: 1, max: 100 } }}
              />
            </Grid>
            <Grid size={12}>
              <Button variant="contained" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Operational Settings'}
              </Button>
            </Grid>
          </Grid>
        ) : (
          <Alert
            severity="error"
            action={<Button onClick={loadSettings}>Retry</Button>}
          >
            {error || 'Operational settings are unavailable.'}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
