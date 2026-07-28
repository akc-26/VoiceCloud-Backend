import React, { useState } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import VerifiedIcon from '@mui/icons-material/Verified';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { useNotificationsStore } from '../store/notifications.store';

interface HostApplication {
  id: string;
  applicant: string;
  agency: string;
  monthlyHours: number;
  status: string;
  submittedAt: string;
}

export const HostsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [applications, setApplications] = useState<HostApplication[]>([
    { id: 'host-app-1', applicant: 'sarah_voice', agency: 'Star Media Agency', monthlyHours: 64, status: 'approved', submittedAt: '2026-07-20' },
    { id: 'host-app-2', applicant: 'dave_singer', agency: 'Apex Talent', monthlyHours: 12, status: 'pending', submittedAt: '2026-07-23' },
  ]);

  const handleApprove = (id: string, name: string) => {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a)));
    addToast('success', `Approved host application for @${name}`);
  };

  const columns: Column<HostApplication>[] = [
    {
      id: 'applicant',
      label: 'Host Handle',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RecordVoiceOverIcon color="primary" />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>@{row.applicant}</Typography>
        </Box>
      ),
    },
    { id: 'agency', label: 'Associated Agency' },
    { id: 'monthlyHours', label: 'Broadcasting Hours', render: (row) => `${row.monthlyHours} hrs/mo` },
    { id: 'status', label: 'Verification Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) =>
        row.status === 'pending' ? (
          <Button size="small" variant="contained" color="success" startIcon={<VerifiedIcon />} onClick={() => handleApprove(row.id, row.applicant)}>
            Approve Host
          </Button>
        ) : (
          <Chip label="Verified Host" color="success" size="small" icon={<VerifiedIcon />} />
        ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Host Management & Verification</Typography>
        <Typography variant="body2" color="text.secondary">Review official host applications, verify voice talent, and manage agency affiliations</Typography>
      </Box>

      <DataTable columns={columns} rows={applications} />
    </Box>
  );
};
