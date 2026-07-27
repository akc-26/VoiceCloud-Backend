import React, { useState } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNotificationsStore } from '../store/notifications.store';

interface ModAction {
  id: string;
  targetUser: string;
  actionType: string;
  reason: string;
  moderator: string;
  timestamp: string;
}

export const ModerationPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [actions] = useState<ModAction[]>([
    { id: 'act-1', targetUser: 'vip_mike', actionType: '24h Mute', reason: 'Abusive language', moderator: 'moderator_jane', timestamp: '2026-07-24 16:20' },
    { id: 'act-2', targetUser: 'spammer_1', actionType: 'Permanent Ban', reason: 'Malicious links', moderator: 'super_admin', timestamp: '2026-07-24 14:10' },
  ]);

  const columns: Column<ModAction>[] = [
    { id: 'id', label: 'Log ID' },
    {
      id: 'targetUser',
      label: 'Target User',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GavelIcon color="warning" />
          <Typography variant="body2" fontWeight={700}>@{row.targetUser}</Typography>
        </Box>
      ),
    },
    { id: 'actionType', label: 'Action Enforcement' },
    { id: 'reason', label: 'Reason' },
    { id: 'moderator', label: 'Enforced By' },
    { id: 'timestamp', label: 'Date' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Moderation & Safety Center</Typography>
        <Typography variant="body2" color="text.secondary">View active mutes, warnings, bans, and enforcement log audit trail</Typography>
      </Box>

      <DataTable columns={columns} rows={actions} />
    </Box>
  );
};
