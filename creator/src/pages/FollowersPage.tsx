import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import { UserCheck, Search, MessageSquare, ShieldCheck } from 'lucide-react';
import { useCreatorProfileStore } from '../store/creator-profile.store';

export const FollowersPage: React.FC = () => {
  const profile = useCreatorProfileStore((state) => state.profile);

  const followersList = [
    { name: 'Alex AudioNut', handle: '@alex_audionut', followedAt: '2 days ago', badge: 'Top Supporter' },
    { name: 'Sarah Waves', handle: '@sarah_waves', followedAt: '5 days ago', badge: 'VIP Subscriber' },
    { name: 'David Beats', handle: '@david_beats', followedAt: '1 week ago', badge: 'Regular Listener' },
    { name: 'Elena Vox', handle: '@elena_vox', followedAt: '2 weeks ago', badge: 'Regular Listener' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Follower Insights & Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Followers: <strong>{profile.followersCount.toLocaleString()}</strong> | +240 new followers this week.
          </Typography>
        </Box>
        <TextField
          placeholder="Search followers..."
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 280 }}
        />
      </Box>

      <Grid container spacing={2.5}>
        {followersList.map((item, idx) => (
          <Grid key={idx} xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Avatar sx={{ width: 56, height: 56, mx: 'auto', mb: 1.5, bgcolor: 'primary.main' }}>
                  {item.name.charAt(0)}
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {item.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {item.handle}
                </Typography>
                <Chip label={item.badge} color="primary" size="small" variant="outlined" sx={{ mb: 1.5 }} />
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                  Followed {item.followedAt}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
