import React, { useState } from 'react';
import { Box, Typography, Button, Card, CardContent, Grid, Chip } from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';

interface VipTier {
  id: string;
  tierName: string;
  monthlyPrice: number;
  activeSubscribers: number;
  badgeIcon: string;
  status: string;
}

export const VipPage: React.FC = () => {
  const [tiers] = useState<VipTier[]>([
    { id: 'vip-1', tierName: 'VIP Silver', monthlyPrice: 9.99, activeSubscribers: 840, badgeIcon: 'Silver Crown', status: 'active' },
    { id: 'vip-2', tierName: 'VIP Gold', monthlyPrice: 29.99, activeSubscribers: 310, badgeIcon: 'Golden Dragon', status: 'active' },
    { id: 'vip-3', tierName: 'VIP Diamond Supreme', monthlyPrice: 99.99, activeSubscribers: 90, badgeIcon: 'Diamond Aura', status: 'active' },
  ]);

  const columns: Column<VipTier>[] = [
    {
      id: 'tierName',
      label: 'VIP Plan Tier',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WorkspacePremiumIcon color="warning" />
          <Typography variant="body2" fontWeight={700}>{row.tierName}</Typography>
        </Box>
      ),
    },
    { id: 'monthlyPrice', label: 'Monthly Price', render: (row) => `$${row.monthlyPrice.toFixed(2)}/mo` },
    { id: 'activeSubscribers', label: 'Active Subscribers', render: (row) => `${row.activeSubscribers} members` },
    { id: 'badgeIcon', label: 'Special Badge', render: (row) => <Chip label={row.badgeIcon} size="small" variant="outlined" /> },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>VIP Membership Tiers</Typography>
        <Typography variant="body2" color="text.secondary">Configure VIP perks, pricing tiers, chat entry effects, and special profile decorations</Typography>
      </Box>

      <DataTable columns={columns} rows={tiers} />
    </Box>
  );
};
