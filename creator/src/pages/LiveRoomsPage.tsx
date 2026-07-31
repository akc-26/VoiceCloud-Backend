import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Avatar,
  Divider,
  Stack,
  IconButton,
} from '@mui/material';
import { Radio, Users, Volume2, Mic, Settings, Play, Plus, Shield } from 'lucide-react';

export const LiveRoomsPage: React.FC = () => {
  const rooms = [
    {
      id: 'room-101',
      title: 'Late Night Audio Lounge & Chill Beats',
      category: 'Audio Lounge',
      status: 'Ready',
      listeners: 0,
      seats: '8/8 Available',
      bitrate: '324kbps Ultra HD',
    },
    {
      id: 'room-102',
      title: 'Creator Q&A & Voice Podcast Session',
      category: 'Podcast',
      status: 'Scheduled',
      listeners: 0,
      seats: '4/4 Co-Host Seats',
      bitrate: '256kbps HD Voice',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Live Audio Rooms Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage live broadcasts, co-host mic seats, audio soundboards, and RTC room configurations.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Plus size={18} />}>
          Create Audio Room
        </Button>
      </Box>

      <Grid container spacing={3}>
        {rooms.map((room) => (
          <Grid key={room.id} xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Chip
                    icon={<Radio size={14} color="#7c3aed" />}
                    label={room.category}
                    color="primary"
                    variant="outlined"
                    size="small"
                  />
                  <Chip label={room.status} color="success" size="small" sx={{ fontWeight: 700 }} />
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {room.title}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2} sx={{ mb: 2.5 }}>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Audio Quality Presets:
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {room.bitrate}
                    </Typography>
                  </Grid>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Co-Host Seats:
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {room.seats}
                    </Typography>
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={1.5}>
                  <Button variant="contained" color="primary" startIcon={<Play size={16} />} fullWidth>
                    Start Room Stream
                  </Button>
                  <Button variant="outlined" color="inherit">
                    <Settings size={18} />
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
