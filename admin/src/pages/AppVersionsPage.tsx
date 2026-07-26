import React, { useState } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';

interface AppVersion {
  id: string;
  platform: 'Android' | 'iOS';
  versionName: string;
  buildNumber: number;
  isForceUpdate: boolean;
  status: string;
  releasedAt: string;
}

export const AppVersionsPage: React.FC = () => {
  const [versions] = useState<AppVersion[]>([
    { id: 'ver-1', platform: 'Android', versionName: 'v1.4.2', buildNumber: 142, isForceUpdate: false, status: 'active', releasedAt: '2026-07-20' },
    { id: 'ver-2', platform: 'iOS', versionName: 'v1.4.2', buildNumber: 142, isForceUpdate: false, status: 'active', releasedAt: '2026-07-20' },
    { id: 'ver-3', platform: 'Android', versionName: 'v1.0.0', buildNumber: 100, isForceUpdate: true, status: 'deprecated', releasedAt: '2026-01-01' },
  ]);

  const columns: Column<AppVersion>[] = [
    {
      id: 'versionName',
      label: 'Version Name',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SystemUpdateIcon color="primary" />
          <Typography variant="body2" fontWeight={700}>{row.versionName} ({row.platform})</Typography>
        </Box>
      ),
    },
    { id: 'buildNumber', label: 'Build Number', render: (row) => `#${row.buildNumber}` },
    {
      id: 'isForceUpdate',
      label: 'Update Policy',
      render: (row) => (row.isForceUpdate ? <Chip label="Force Update Required" color="error" size="small" /> : 'Optional Update'),
    },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { id: 'releasedAt', label: 'Release Date' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>App Version Control & Over-The-Air</Typography>
        <Typography variant="body2" color="text.secondary">Manage mobile app build releases, force update flags, and client API compatibility limits</Typography>
      </Box>

      <DataTable columns={columns} rows={versions} />
    </Box>
  );
};
