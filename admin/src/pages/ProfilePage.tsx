import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, TextField } from '@mui/material';

import { useAuthStore } from '../store/auth.store';
import { AvatarUpload } from '../components/common/AvatarUpload';
import { useNotificationsStore } from '../store/notifications.store';

export const ProfilePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const addToast = useNotificationsStore((state) => state.addToast);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  const handleSaveProfile = () => {
    updateUser({ displayName, avatarUrl });
    addToast('success', 'Admin profile updated successfully');
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Admin Profile & Credentials</Typography>
        <Typography variant="body2" color="text.secondary">Manage your personal admin account details, security credentials, and display preferences</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <AvatarUpload value={avatarUrl} name={displayName || user?.username} onChange={setAvatarUrl} />
              </Box>
              <TextField
                fullWidth
                size="small"
                label="Username / Handle"
                value={user?.username || ''}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Email Address"
                value={user?.email || ''}
                disabled
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                size="small"
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                sx={{ mb: 3 }}
              />
              <Button variant="contained" color="primary" onClick={handleSaveProfile} sx={{ borderRadius: 2 }}>
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
