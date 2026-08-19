import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { roomsService, RoomItem } from '../services/rooms.service';
import { StatusBadge } from '../components/common/StatusBadge';

export const RoomDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    roomsService.getRoomById(id).then((data) => { if (active) setRoom(data); }).catch((err: any) => { if (active) setError(err?.response?.data?.message || err?.message || 'Room not found'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;
  if (!room) return <Box><Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/rooms')}>Back</Button><Typography color="error" sx={{ mt: 2 }}>{error}</Typography></Box>;

  const fields: Array<[string, React.ReactNode]> = [
    ['Room ID', room.id], ['Host', room.hostName || room.hostUsername || room.hostId], ['Host User ID', room.hostId], ['Category', room.category], ['Language', room.language || '—'], ['Audio Quality', room.audioQuality || '—'], ['Access', room.isPrivate ? 'Private' : 'Public'], ['Listeners', room.listenerCount || 0], ['Speakers', room.speakerCount || 0], ['Gift Activity', room.giftActivity ?? 0], ['Popularity', room.popularityScore ?? 0], ['Created', new Date(room.createdAt).toLocaleString()], ['Started', room.startedAt ? new Date(room.startedAt).toLocaleString() : '—'], ['Ended', room.endedAt ? new Date(room.endedAt).toLocaleString() : '—'],
  ];
  return <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}><Box><Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/rooms')}>Rooms</Button><Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>{room.title}</Typography><Typography color="text.secondary">{room.description || 'No description'}</Typography></Box><Stack direction="row" spacing={1}><Chip label={room.isPrivate ? 'Private' : 'Public'} color={room.isPrivate ? 'warning' : 'success'} /><StatusBadge status={String(room.status).toLowerCase()} /></Stack></Stack>
    <Grid container spacing={2}>{fields.map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}><Card variant="outlined"><CardContent><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="body1" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{value}</Typography></CardContent></Card></Grid>)}</Grid>
  </Box>;
};
