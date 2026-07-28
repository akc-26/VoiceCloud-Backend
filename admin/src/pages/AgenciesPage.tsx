import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';

interface AgencyItem {
  id: string;
  name: string;
  owner: string;
  totalHosts: number;
  monthlyRevenue: number;
  status: string;
}

export const AgenciesPage: React.FC = () => {
  const [agencies] = useState<AgencyItem[]>([
    { id: 'agency-1', name: 'Star Media Agency', owner: 'victoria_ceo', totalHosts: 28, monthlyRevenue: 14500, status: 'active' },
    { id: 'agency-2', name: 'Apex Talent Guild', owner: 'marcus_g', totalHosts: 15, monthlyRevenue: 8200, status: 'active' },
  ]);

  const columns: Column<AgencyItem>[] = [
    {
      id: 'name',
      label: 'Agency Name',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon color="primary" />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
        </Box>
      ),
    },
    { id: 'owner', label: 'Agency Owner', render: (row) => `@${row.owner}` },
    { id: 'totalHosts', label: 'Managed Hosts', render: (row) => `${row.totalHosts} hosts` },
    { id: 'monthlyRevenue', label: 'Monthly Gift Revenue', render: (row) => `$${row.monthlyRevenue.toLocaleString()}` },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Agency Guild Directory</Typography>
        <Typography variant="body2" color="text.secondary">Manage host talent agencies, revenue sharing cuts, and agency member rosters</Typography>
      </Box>

      <DataTable columns={columns} rows={agencies} />
    </Box>
  );
};
