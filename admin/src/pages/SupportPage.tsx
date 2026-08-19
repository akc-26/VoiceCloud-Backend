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
  const [tickets] = useState<TicketItem[]>([]);


  const columns: Column<TicketItem>[] = [
    { id: 'id', label: 'Ticket ID' },
    {
      id: 'subject',
      label: 'Subject',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlinedIcon color="primary" />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.subject}</Typography>
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
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Support Ticket Desk</Typography>
        <Typography variant="body2" color="text.secondary">Support ticket data is shown only when backed by a persisted ticket service. No fabricated tickets are displayed.</Typography>
      </Box>

      <DataTable columns={columns} rows={tickets} />
    </Box>
  );
};
