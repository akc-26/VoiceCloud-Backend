import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { Calendar, Plus, Clock, Users, Bell } from 'lucide-react';

export const SchedulePage: React.FC = () => {
  const scheduleEvents = [
    {
      id: 'sch-1',
      title: 'Weekly Creator VIP Broadcast',
      date: 'Tomorrow, Aug 1, 2026',
      time: '20:00 - 22:00 UTC',
      attendees: 420,
      type: 'VIP Broadcast',
    },
    {
      id: 'sch-2',
      title: 'Live Acoustic Audio Session',
      date: 'Friday, Aug 3, 2026',
      time: '18:00 - 20:00 UTC',
      attendees: 890,
      type: 'Public Stream',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Stream & Session Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule future live rooms, notify subscribers, and automate stream reminders.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<Plus size={18} />}>
          Schedule Broadcast
        </Button>
      </Box>

      <Grid container spacing={3}>
        {scheduleEvents.map((evt) => (
          <Grid key={evt.id} xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Chip label={evt.type} color="primary" size="small" />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Bell size={14} /> Reminders Enabled
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {evt.title}
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Calendar size={16} /> {evt.date}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Clock size={16} /> {evt.time}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Users size={14} /> {evt.attendees} RSVP Reminders
                  </Typography>
                  <Button size="small" variant="outlined">
                    Edit Schedule
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
