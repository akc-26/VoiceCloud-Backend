import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, TextField, CircularProgress } from '@mui/material';
import { useAuthStore } from '../store/auth.store';
import { AvatarUpload } from '../components/common/AvatarUpload';
import { useNotificationsStore } from '../store/notifications.store';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const addToast = useNotificationsStore((state) => state.addToast);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setAvatarUrl(user?.avatarUrl || '');
  }, [user?.displayName, user?.avatarUrl]);

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      const profileResponse = await api.patch('/users/profile', { displayName: displayName.trim() });
      let persistedAvatarUrl = profileResponse.data?.avatarUrl ?? user.avatarUrl ?? '';

      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const avatarResponse = await api.post('/users/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        persistedAvatarUrl = avatarResponse.data?.avatarUrl ?? persistedAvatarUrl;
      }

      updateUser({
        displayName: profileResponse.data?.displayName ?? displayName.trim(),
        avatarUrl: persistedAvatarUrl,
      });
      setAvatarUrl(persistedAvatarUrl);
      setAvatarFile(null);
      addToast('success', 'Admin profile persisted successfully');
    } catch (error: any) {
      addToast('error', error?.message || 'Failed to update admin profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Admin Profile & Credentials</Typography>
        <Typography variant="body2" color="text.secondary">Manage your persisted admin profile. Credential/security changes remain under Auth & Identity.</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0}>
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <AvatarUpload
                  value={avatarUrl}
                  name={displayName || user?.username}
                  onChange={setAvatarUrl}
                  onFileSelected={setAvatarFile}
                />
              </Box>
              <TextField fullWidth size="small" label="Username / Handle" value={user?.username || ''} disabled sx={{ mb: 2 }} />
              <TextField fullWidth size="small" label="Email Address" value={user?.email || ''} disabled sx={{ mb: 2 }} />
              <TextField fullWidth size="small" label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} sx={{ mb: 3 }} />
              <Button
                variant="contained"
                color="primary"
                onClick={() => void handleSaveProfile()}
                disabled={saving || !displayName.trim()}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{ borderRadius: 2 }}
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
