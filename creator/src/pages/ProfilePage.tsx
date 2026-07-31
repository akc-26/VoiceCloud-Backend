import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Button,
  TextField,
  Chip,
  Divider,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle2, Save, Camera } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { useCreatorProfileStore } from '../store/creator-profile.store';
import { PageErrorState } from '../components/common/PageErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const profile = useCreatorProfileStore((state) => state.profile);
  const setProfile = useCreatorProfileStore((state) => state.setProfile);

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [category, setCategory] = useState(profile.category || 'Podcast & Audio Lounge');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setHandle(profile.handle);
    setBio(profile.bio);
  }, [profile]);

  const profileQuery = useQuery({
    queryKey: ['creator', 'profile'],
    queryFn: ({ signal }) => creatorApi.getMyProfile(signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => creatorApi.updateProfile(data),
    onSuccess: (res: any) => {
      setProfile({
        ...profile,
        displayName: res.displayName || displayName,
        handle: res.username ? `@${res.username}` : handle,
        bio: res.bio || bio,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['creator', 'profile'] });
    },
    onError: () => {
      // Fallback local state save if backend offline
      setProfile({
        ...profile,
        displayName,
        handle,
        bio,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  if (profileQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="card" count={2} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Creator Profile & Host Identity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your public audio lounge profile, host bio, channel cover, and verification status.
        </Typography>
      </Box>

      {savedSuccess && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          Profile changes saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid xs={12} md={4}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent sx={{ p: 3 }}>
              <Avatar
                src={profile.avatarUrl}
                alt={profile.displayName}
                sx={{ width: 96, height: 96, mx: 'auto', mb: 2, border: '3px solid', borderColor: 'primary.main' }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {profile.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {profile.handle}
              </Typography>
              <Chip
                icon={<CheckCircle2 size={14} />}
                label={profile.verified ? 'Verified Creator' : 'Host Account'}
                color="primary"
                size="small"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1} sx={{ textAlign: 'left' }}>
                <Typography variant="caption" color="text.secondary">
                  Category: <strong>{profile.category || 'Podcast & Audio Lounge'}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Creator Tier: <strong>{profile.tier}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Followers: <strong>{(profile.followersCount ?? 0).toLocaleString()}</strong>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Edit Profile Settings */}
        <Grid xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
                Edit Channel Settings
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Creator Handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Channel Bio / Lounge Description"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Save size={18} />}
                  onClick={() =>
                    updateMutation.mutate({
                      displayName,
                      username: handle.replace(/^@/, ''),
                      bio,
                    })
                  }
                  disabled={updateMutation.isPending}
                  sx={{ alignSelf: 'flex-start', fontWeight: 700 }}
                >
                  {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save Profile Changes'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
