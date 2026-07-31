import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Radio,
  Users,
  Play,
  Square,
  Plus,
  Settings,
  Trash2,
  Calendar,
  Edit,
  Clock,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { LiveRoomSummary } from '../types/creator.types';

export const LiveRoomsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Audio Lounge');
  const [newQuality, setNewQuality] = useState('324kbps Ultra HD');

  const roomsQuery = useQuery({
    queryKey: ['creator', 'rooms'],
    queryFn: ({ signal }) => creatorApi.getRooms(signal),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<LiveRoomSummary>) => creatorApi.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
      setIsCreateOpen(false);
      setNewTitle('');
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => creatorApi.startRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => creatorApi.endRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => creatorApi.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'rooms'] });
    },
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle,
      category: newCategory,
      audioQuality: newQuality,
      status: 'offline',
      currentListeners: 0,
      peakListeners: 0,
    });
  };

  if (roomsQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="card" count={3} />
      </Box>
    );
  }

  if (roomsQuery.isError) {
    return (
      <PageErrorState
        title="Unable to Load Live Rooms"
        message={roomsQuery.error?.message || 'Failed to fetch live audio rooms from backend.'}
        onRetry={() => roomsQuery.refetch()}
      />
    );
  }

  const rooms = roomsQuery.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Live Audio Rooms Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage live broadcasts, co-host mic seats, audio soundboards, and RTC room configurations.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={18} />}
          onClick={() => setIsCreateOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Create Audio Room
        </Button>
      </Box>

      {/* Empty State */}
      {rooms.length === 0 ? (
        <EmptyState
          icon={<Radio size={48} />}
          title="No Audio Rooms Available"
          description="Create your first audio room to start broadcasting live sessions to your followers."
          actionLabel="Create Audio Room"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <Grid container spacing={3}>
          {rooms.map((room) => {
            const isLive = room.status === 'live';
            return (
              <Grid key={room.id} xs={12} md={6}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Chip
                        icon={<Radio size={14} color="#7c3aed" />}
                        label={room.category}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        label={isLive ? '🔴 LIVE' : room.status.toUpperCase()}
                        color={isLive ? 'error' : 'default'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {room.title}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2} sx={{ mb: 2.5 }}>
                      <Grid xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Audio Preset:
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {room.audioQuality || '324kbps Ultra HD'}
                        </Typography>
                      </Grid>
                      <Grid xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Current Listeners:
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Users size={14} /> {room.currentListeners.toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1.5}>
                      {isLive ? (
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<Square size={16} />}
                          fullWidth
                          onClick={() => endMutation.mutate(room.id)}
                          disabled={endMutation.isPending}
                          sx={{ fontWeight: 700 }}
                        >
                          {endMutation.isPending ? 'Ending...' : 'End Broadcast'}
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<Play size={16} />}
                          fullWidth
                          onClick={() => startMutation.mutate(room.id)}
                          disabled={startMutation.isPending}
                          sx={{ fontWeight: 700 }}
                        >
                          {startMutation.isPending ? 'Starting...' : 'Start Broadcast'}
                        </Button>
                      )}

                      <IconButton
                        color="error"
                        onClick={() => deleteMutation.mutate(room.id)}
                        disabled={deleteMutation.isPending}
                        size="small"
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Room Modal */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create New Live Audio Room</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Room Title"
              placeholder="e.g. Late Night Acoustic Session & Chat"
              fullWidth
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <TextField
              select
              label="Category"
              fullWidth
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <MenuItem value="Audio Lounge">Audio Lounge</MenuItem>
              <MenuItem value="Podcast">Podcast</MenuItem>
              <MenuItem value="Music & Jam">Music & Jam</MenuItem>
              <MenuItem value="Talk Show">Talk Show</MenuItem>
            </TextField>
            <TextField
              select
              label="Audio Quality Preset"
              fullWidth
              value={newQuality}
              onChange={(e) => setNewQuality(e.target.value)}
            >
              <MenuItem value="324kbps Ultra HD">324kbps Ultra HD Voice</MenuItem>
              <MenuItem value="256kbps HD Voice">256kbps HD Voice</MenuItem>
              <MenuItem value="128kbps Standard">128kbps Standard Voice</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newTitle.trim() || createMutation.isPending}
            sx={{ fontWeight: 700 }}
          >
            {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Room'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
