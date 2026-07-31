import React, { useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Calendar, Plus, Clock, Users, Bell, Radio } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const SchedulePage: React.FC = () => {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const scheduleQuery = useQuery({
    queryKey: ['creator', 'schedule'],
    queryFn: ({ signal }) => creatorApi.getScheduledRooms(signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (scheduleQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="card" count={2} />
      </Box>
    );
  }

  if (scheduleQuery.isError) {
    return (
      <PageErrorState
        title="Failed to Load Schedule"
        message={scheduleQuery.error?.message || 'Unable to retrieve upcoming broadcast events.'}
        onRetry={() => scheduleQuery.refetch()}
      />
    );
  }

  const events = scheduleQuery.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Stream & Session Schedule
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule future live rooms, notify subscribers, and automate stream reminders.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={18} />}
          onClick={() => setIsScheduleOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Schedule Broadcast
        </Button>
      </Box>

      {/* Events Grid or Empty State */}
      {events.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title="No Scheduled Broadcasts"
          description="You have no upcoming live sessions scheduled. Schedule one now to alert your subscribers."
          actionLabel="Schedule Session"
          onAction={() => setIsScheduleOpen(true)}
        />
      ) : (
        <Grid container spacing={3}>
          {events.map((evt: any, idx: number) => (
            <Grid key={evt.id || idx} xs={12} md={6}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Chip label={evt.type || 'Live Stream'} color="primary" size="small" />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Bell size={14} /> Reminders Active
                    </Typography>
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {evt.title}
                  </Typography>

                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Calendar size={16} /> {evt.date || 'Upcoming'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Clock size={16} /> {evt.time || '20:00 UTC'}
                    </Typography>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Users size={14} /> {evt.attendees ?? 0} RSVP Reminders
                    </Typography>
                    <Button size="small" variant="outlined">
                      Manage Session
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Schedule Modal */}
      <Dialog open={isScheduleOpen} onClose={() => setIsScheduleOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Schedule Future Broadcast</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Broadcast Title" placeholder="e.g. VIP Member Q&A Hour" fullWidth />
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="Time (UTC)" type="time" InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setIsScheduleOpen(false);
              scheduleQuery.refetch();
            }}
            sx={{ fontWeight: 700 }}
          >
            Save Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
