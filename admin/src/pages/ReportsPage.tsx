import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNotificationsStore } from '../store/notifications.store';

interface AbuseReport {
  id: string;
  reportedEntity: string;
  reporter: string;
  reason: string;
  category: string;
  status: string;
  timestamp: string;
}

export const ReportsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [reports, setReports] = useState<AbuseReport[]>([
    { id: 'rep-1', reportedEntity: 'Room #102', reporter: 'user_99', reason: 'Abusive language in voice chat', category: 'Harassment', status: 'pending', timestamp: '2026-07-24 18:30' },
    { id: 'rep-2', reportedEntity: 'User @bad_actor', reporter: 'sarah_voice', reason: 'Spamming advertisement links', category: 'Spam', status: 'pending', timestamp: '2026-07-24 17:15' },
  ]);

  const handleResolve = (id: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'completed' } : r)));
    addToast('success', `Resolved report #${id}`);
  };

  const columns: Column<AbuseReport>[] = [
    { id: 'id', label: 'Report ID' },
    {
      id: 'reportedEntity',
      label: 'Reported Entity',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReportProblemIcon color="error" />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.reportedEntity}</Typography>
        </Box>
      ),
    },
    { id: 'reporter', label: 'Filed By' },
    { id: 'reason', label: 'Reason / Description' },
    { id: 'category', label: 'Category' },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) =>
        row.status === 'pending' ? (
          <Button size="small" variant="contained" color="primary" onClick={() => handleResolve(row.id)}>
            Mark Resolved
          </Button>
        ) : null,
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>User & Room Abuse Reports</Typography>
        <Typography variant="body2" color="text.secondary">Review user complaints, illegal voice stream reports, and moderation flags</Typography>
      </Box>

      <DataTable columns={columns} rows={reports} />
    </Box>
  );
};
