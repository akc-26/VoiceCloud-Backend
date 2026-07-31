import React from 'react';
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
} from '@mui/material';
import { User, CheckCircle2, Camera, Sparkles } from 'lucide-react';
import { useCreatorProfileStore } from '../store/creator-profile.store';

export const ProfilePage: React.FC = () => {
  const profile = useCreatorProfileStore((state) => state.profile);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Creator Profile & Host Identity
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your public audio lounge profile, host bio, channel cover, and verification status.
        </Typography>
      </Box>

      <Grid container spacing={3}>
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
              <Chip icon={<CheckCircle2 size={14} />} label="Verified Host" color="primary" size="small" sx={{ mb: 2 }} />

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1} sx={{ textAlign: 'left' }}>
                <Typography variant="caption" color="text.secondary">
                  Category: <strong>{profile.category}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Creator Tier: <strong>{profile.tier}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Followers: <strong>{profile.followersCount.toLocaleString()}</strong>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
                Edit Channel Settings
              </Typography>
              <Stack spacing={2.5}>
                <TextField label="Display Name" defaultValue={profile.displayName} fullWidth />
                <TextField label="Creator Handle" defaultValue={profile.handle} fullWidth />
                <TextField label="Channel Bio / Lounge Description" defaultValue={profile.bio} multiline rows={4} fullWidth />
                <Button variant="contained" color="primary" sx={{ alignSelf: 'flex-start' }}>
                  Save Profile Changes
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
