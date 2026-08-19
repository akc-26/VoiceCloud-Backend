import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  AdminNotificationRecord,
  notificationsAdminService,
} from '../services/notifications-admin.service';
import { useNotificationsStore } from '../store/notifications.store';

const NOTIFICATION_TYPES = ['IN_APP', 'SYSTEM', 'ROOM_INVITATION', 'GIFT', 'VIP', 'AGENCY', 'HOST_APPROVAL', 'ANNOUNCEMENT'];

export const NotificationsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AdminNotificationRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ userId: '', type: 'SYSTEM', title: '', message: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationsAdminService.getDeliveryLog({ page: 1, limit: 100 });
      setLogs(result.data || []);
    } catch (error: any) {
      addToast('error', error.message || 'Failed to load notification delivery log');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const send = async () => {
    try {
      await notificationsAdminService.createNotification({
        ...form,
        operationKey: `admin-ui:${Date.now()}`,
      });
      addToast('success', 'Notification persisted for delivery');
      setOpen(false);
      setForm({ userId: '', type: 'SYSTEM', title: '', message: '' });
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to create notification');
    }
  };

  const columns: Column<AdminNotificationRecord>[] = [
    { id: 'id', label: 'Notification ID' },
    { id: 'userId', label: 'Recipient User ID' },
    {
      id: 'title',
      label: 'Title',
      render: (row) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><NotificationsIcon color="primary" /><Typography variant="body2" sx={{ fontWeight: 700 }}>{row.title}</Typography></Box>,
    },
    { id: 'type', label: 'Type' },
    { id: 'deliveryStatus', label: 'Delivery', render: (row) => <StatusBadge status={row.deliveryStatus.toLowerCase()} /> },
    { id: 'deliveryAttemptCount', label: 'Attempts' },
    { id: 'createdAt', label: 'Created', render: (row) => new Date(row.createdAt).toLocaleString() },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Notification Delivery Console</Typography>
          <Typography variant="body2" color="text.secondary">Persist notifications once and monitor BullMQ delivery state and retry attempts.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshIcon />} onClick={fetchData} variant="outlined" disabled={loading}>Refresh</Button>
          <Button startIcon={<AddIcon />} onClick={() => setOpen(true)} variant="contained">Create Notification</Button>
        </Stack>
      </Box>

      {loading && logs.length === 0 ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box> : <DataTable columns={columns} rows={logs} />}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Persisted Notification</DialogTitle>
        <DialogContent dividers><Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Recipient User UUID" value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} fullWidth />
          <TextField select label="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} fullWidth>{NOTIFICATION_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField>
          <TextField label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} fullWidth />
          <TextField label="Message" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} multiline minRows={3} fullWidth />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" onClick={send} disabled={!form.userId || !form.title || !form.message}>Persist Notification</Button></DialogActions>
      </Dialog>
    </Box>
  );
};
