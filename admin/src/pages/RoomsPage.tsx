import React, { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Button, Chip, Stack } from '@mui/material';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';

import { DataTable, Column } from '../components/common/DataTable';
import { SearchBar } from '../components/common/SearchBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { Pagination } from '../components/common/Pagination';
import { roomsService, RoomItem } from '../services/rooms.service';
import { useNotificationsStore } from '../store/notifications.store';

export const RoomsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const response = await roomsService.getRooms({ page, limit, search: search || undefined });
      setRooms(response.data || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      setRooms([]);
      setTotal(0);
      addToast('error', error?.response?.data?.message || error?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [addToast, limit, page, search]);

  useEffect(() => { void loadRooms(); }, [loadRooms]);
  useEffect(() => { setPage(1); }, [search]);

  const handleCloseRoom = async () => {
    if (!selectedRoom) return;
    try {
      await roomsService.closeRoom(selectedRoom.id);
      addToast('success', `Terminated room "${selectedRoom.title}"`);
      await loadRooms();
    } catch (error: any) {
      addToast('error', error?.response?.data?.message || 'Failed to terminate room');
    } finally {
      setDialogOpen(false);
      setSelectedRoom(null);
    }
  };

  const columns: Column<RoomItem>[] = [
    {
      id: 'title', label: 'Room Name', render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MeetingRoomIcon color="primary" />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.title}</Typography>
            <Typography variant="caption" color="text.secondary">{row.category} • Host: {row.hostName || row.hostUsername || row.hostId}</Typography>
          </Box>
        </Box>
      ),
    },
    { id: 'participantCount', label: 'Active Speakers/Listeners', render: (row) => <Chip label={`${row.participantCount || 0} active`} size="small" color="primary" variant="outlined" /> },
    { id: 'isPrivate', label: 'Access', render: (row) => <Chip label={row.isPrivate ? 'Private' : 'Public'} size="small" color={row.isPrivate ? 'warning' : 'success'} variant="outlined" /> },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={String(row.status).toLowerCase()} /> },
    {
      id: 'actions', label: 'Actions', align: 'right', render: (row) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => navigate(`/rooms/${row.id}`)}>View</Button>
          {(String(row.status).toLowerCase() === 'live' || String(row.status).toLowerCase() === 'paused') && (
            <Button size="small" color="error" variant="outlined" startIcon={<HighlightOffIcon />} onClick={() => { setSelectedRoom(row); setDialogOpen(true); }}>Terminate</Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Voice Room Operations</Typography>
        <Typography variant="body2" color="text.secondary">Real-time room records created by verified Hosts. Private rooms are visible to Admin but remain hidden from public discovery.</Typography>
      </Box>
      <Box sx={{ mb: 3 }}><SearchBar value={search} onChange={setSearch} placeholder="Search rooms by title or description..." /></Box>
      <DataTable columns={columns} rows={rooms} loading={loading} emptyTitle="No rooms found" emptyDescription="No Host-created rooms match the current search." />
      <Pagination page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(value) => { setLimit(value); setPage(1); }} />
      <ConfirmationDialog open={dialogOpen} title="Terminate Voice Room" message={`Force end active voice room "${selectedRoom?.title}"? The completed room record will be retained for history.`} confirmText="Terminate Room" confirmColor="error" onConfirm={handleCloseRoom} onCancel={() => setDialogOpen(false)} />
    </Box>
  );
};
