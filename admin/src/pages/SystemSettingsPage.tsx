import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Switch, FormControlLabel, TextField, Button, Grid } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

import { useNotificationsStore } from '../store/notifications.store';

export const SystemSettingsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxSpeakers, setMaxSpeakers] = useState('12');
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState('24');

  const handleSave = () => {
    addToast('success', 'System settings updated successfully');
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Global System Settings</Typography>
        <Typography variant="body2" color="text.secondary">Configure core platform operating thresholds, maintenance modes, and security timeout policies</Typography>
      </Box>

      <Card elevation={0} sx={{ p: 1 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} color="error" />}
                label={
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Emergency Maintenance Mode</Typography>
                    <Typography variant="caption" color="text.secondary">Block new guest logins and voice room creation during system updates</Typography>
                  </Box>
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Maximum Speaker Seats Per Voice Room"
                type="number"
                value={maxSpeakers}
                onChange={(e) => setMaxSpeakers(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Admin Session Timeout (Hours)"
                type="number"
                value={sessionTimeoutHours}
                onChange={(e) => setSessionTimeoutHours(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" color="primary" onClick={handleSave} sx={{ borderRadius: 2, px: 4 }}>
                Apply System Settings
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};
