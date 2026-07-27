import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';

interface TicketItem {
  id: string;
  user: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
}

export const SupportPage: React.FC = () => {
  const [tickets] = useState<TicketItem[]>([
    { id: 'ticket-501', user: 'alex_pro', subject: 'Coin Recharge Failed On Stripe', category: 'Billing', status: 'pending', createdAt: '2026-07-24 12:10' },
    { id: 'ticket-502', user: 'sarah_voice', subject: 'Host Payout Tax Verification Document', category: 'Host Payout', status: 'completed', createdAt: '2026-07-23 15:40' },
  ]);

  const columns: Column<TicketItem>[] = [
    { id: 'id', label: 'Ticket ID' },
    {
      id: 'subject',
      label: 'Subject',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlinedIcon color="primary" />
          <Typography variant="body2" fontWeight={700}>{row.subject}</Typography>
        </Box>
      ),
    },
    { id: 'user', label: 'User' },
    { id: 'category', label: 'Category' },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { id: 'createdAt', label: 'Created Date' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Support Ticket Desk</Typography>
        <Typography variant="body2" color="text.secondary">Assist users with coin recharge issues, account recovery, host payouts, and platform inquiries</Typography>
      </Box>

      <DataTable columns={columns} rows={tickets} />
    </Box>
  );
};
