import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';

interface NotifLog {
  id: string;
  type: string;
  title: string;
  recipientCount: number;
  status: string;
  sentAt: string;
}

export const NotificationsPage: React.FC = () => {
  const [logs] = useState<NotifLog[]>([
    { id: 'notif-101', type: 'SYSTEM_ALERT', title: 'Security Verification Required', recipientCount: 14200, status: 'completed', sentAt: '2026-07-24 10:00' },
    { id: 'notif-102', type: 'ROOM_INVITE', title: 'Live Voice Stream Starting', recipientCount: 350, status: 'completed', sentAt: '2026-07-23 20:15' },
  ]);

  const columns: Column<NotifLog>[] = [
    { id: 'id', label: 'Push ID' },
    {
      id: 'title',
      label: 'Notification Title',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsIcon color="primary" />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.title}</Typography>
        </Box>
      ),
    },
    { id: 'type', label: 'Push Category' },
    { id: 'recipientCount', label: 'Delivered Users', render: (row) => `${row.recipientCount.toLocaleString()} devices` },
    { id: 'status', label: 'Delivery Status', render: (row) => <StatusBadge status={row.status} /> },
    { id: 'sentAt', label: 'Sent Time' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Push Notification Dispatcher</Typography>
        <Typography variant="body2" color="text.secondary">Monitor push notification delivery metrics, trigger in-app alerts, and dispatch system alerts</Typography>
      </Box>

      <DataTable columns={columns} rows={logs} />
    </Box>
  );
};
