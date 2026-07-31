import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';

import { DataTable, Column } from '../components/common/DataTable';

interface AuditLogItem {
  id: string;
  adminUser: string;
  action: string;
  target: string;
  ipAddress: string;
  timestamp: string;
}

export const AuditLogsPage: React.FC = () => {
  const [logs] = useState<AuditLogItem[]>([
    { id: 'log-1001', adminUser: 'super_admin', action: 'UPDATE_FEATURE_FLAG', target: 'enable_ai_noise_cancelling', ipAddress: '192.168.1.45', timestamp: '2026-07-24 18:22:10' },
    { id: 'log-1002', adminUser: 'moderator_jane', action: 'BAN_USER_ACCOUNT', target: 'usr-3 (vip_mike)', ipAddress: '10.0.4.12', timestamp: '2026-07-24 16:15:00' },
  ]);

  const columns: Column<AuditLogItem>[] = [
    { id: 'id', label: 'Audit ID' },
    {
      id: 'adminUser',
      label: 'Admin Actor',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" fontSize="small" />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>@{row.adminUser}</Typography>
        </Box>
      ),
    },
    { id: 'action', label: 'Action Event' },
    { id: 'target', label: 'Target Resource' },
    { id: 'ipAddress', label: 'IP Address' },
    { id: 'timestamp', label: 'Timestamp' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Administrative Audit Trail</Typography>
        <Typography variant="body2" color="text.secondary">Immutable system audit logs recording all staff modifications, bans, and setting changes</Typography>
      </Box>

      <DataTable columns={columns} rows={logs} />
    </Box>
  );
};
