import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Chip, IconButton } from '@mui/material';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

import { DataTable, Column } from '../components/common/DataTable';
import { SearchBar } from '../components/common/SearchBar';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { roomsService, RoomItem } from '../services/rooms.service';
import { useNotificationsStore } from '../store/notifications.store';

export const RoomsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [rooms, setRooms] = useState<RoomItem[]>([
    { id: 'room-101', title: 'Late Night Chill & Acoustic Music', hostId: 'usr-2', category: 'Music & Singing', isPrivate: false, participantCount: 42, status: 'live', createdAt: '2026-07-24' },
    { id: 'room-102', title: 'VALORANT Ranked Voice Squad', hostId: 'usr-5', category: 'Gaming', isPrivate: true, participantCount: 5, status: 'live', createdAt: '2026-07-24' },
    { id: 'room-103', title: 'Global Tech & Startup Podcast', hostId: 'usr-8', category: 'Podcast', isPrivate: false, participantCount: 128, status: 'live', createdAt: '2026-07-24' },
  ]);

  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCloseRoom = async () => {
    if (!selectedRoom) return;
    try {
      await roomsService.closeRoom(selectedRoom.id);
    } catch {
      // Handled
    }
    setRooms((prev) => prev.filter((r) => r.id !== selectedRoom.id));
    addToast('success', `Terminated room "${selectedRoom.title}"`);
    setDialogOpen(false);
    setSelectedRoom(null);
  };

  const columns: Column<RoomItem>[] = [
    {
      id: 'title',
      label: 'Room Name',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MeetingRoomIcon color="primary" />
          <Box>
            <Typography variant="body2" fontWeight={700}>
              {row.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {row.id} • Category: {row.category}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'participantCount',
      label: 'Live Active Speakers/Listeners',
      render: (row) => (
        <Chip label={`${row.participantCount} active`} size="small" color="primary" variant="outlined" />
      ),
    },
    {
      id: 'isPrivate',
      label: 'Access',
      render: (row) => (row.isPrivate ? 'Private' : 'Public'),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<HighlightOffIcon />}
          onClick={() => {
            setSelectedRoom(row);
            setDialogOpen(true);
          }}
        >
          Terminate
        </Button>
      ),
    },
  ];

  const filtered = rooms.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          Voice Room Operations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor active voice sessions, speaker capacities, room categories, and terminate illegal rooms
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search voice rooms..." />
      </Box>

      <DataTable columns={columns} rows={filtered} />

      <ConfirmationDialog
        open={dialogOpen}
        title="Terminate Voice Room"
        message={`Force close active voice room "${selectedRoom?.title}"? All connected listeners will be disconnected.`}
        confirmText="Terminate Room"
        confirmColor="error"
        onConfirm={handleCloseRoom}
        onCancel={() => setDialogOpen(false)}
      />
    </Box>
  );
};
