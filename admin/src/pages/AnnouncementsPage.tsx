import React, { useState } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import AddIcon from '@mui/icons-material/Add';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { ModalForms } from '../components/common/ModalForms';
import { FormBuilder, FormField } from '../components/common/FormBuilder';
import { useNotificationsStore } from '../store/notifications.store';

interface Announcement {
  id: string;
  title: string;
  targetAudience: string;
  priority: string;
  status: string;
  createdAt: string;
}

export const AnnouncementsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    { id: 'ann-1', title: 'Scheduled Platform System Upgrade v2.0', targetAudience: 'Global All Users', priority: 'HIGH', status: 'published', createdAt: '2026-07-24' },
    { id: 'ann-2', title: 'Host Weekly Bonus Diamond Competition', targetAudience: 'Verified Hosts', priority: 'MEDIUM', status: 'published', createdAt: '2026-07-23' },
  ]);

  const [modalOpen, setModalOpen] = useState(false);

  const formFields: FormField[] = [
    { name: 'title', label: 'Announcement Title', type: 'text', required: true, gridSpan: 12 },
    { name: 'targetAudience', label: 'Audience Group', type: 'select', options: [{ label: 'Global All Users', value: 'Global All Users' }, { label: 'Verified Hosts', value: 'Verified Hosts' }, { label: 'VIP Members', value: 'VIP Members' }], gridSpan: 6 },
    { name: 'priority', label: 'Priority', type: 'select', options: [{ label: 'HIGH', value: 'HIGH' }, { label: 'MEDIUM', value: 'MEDIUM' }, { label: 'LOW', value: 'LOW' }], gridSpan: 6 },
    { name: 'content', label: 'Message Body', type: 'textarea', required: true, gridSpan: 12 },
  ];

  const handleCreate = (data: any) => {
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: data.title,
      targetAudience: data.targetAudience || 'Global All Users',
      priority: data.priority || 'MEDIUM',
      status: 'published',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    addToast('success', `Broadcasted announcement "${newAnn.title}"`);
    setModalOpen(false);
  };

  const columns: Column<Announcement>[] = [
    {
      id: 'title',
      label: 'Title',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CampaignIcon color="primary" />
          <Typography variant="body2" fontWeight={700}>{row.title}</Typography>
        </Box>
      ),
    },
    { id: 'targetAudience', label: 'Audience' },
    { id: 'priority', label: 'Priority', render: (row) => <Chip label={row.priority} size="small" color={row.priority === 'HIGH' ? 'error' : 'info'} /> },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { id: 'createdAt', label: 'Date' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>System Announcements</Typography>
          <Typography variant="body2" color="text.secondary">Broadcast platform news, event notices, maintenance windows, and host updates</Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
          New Broadcast
        </Button>
      </Box>

      <DataTable columns={columns} rows={announcements} />

      <ModalForms open={modalOpen} title="New System Broadcast Announcement" onClose={() => setModalOpen(false)}>
        <FormBuilder fields={formFields} onSubmit={handleCreate} submitText="Publish Announcement" />
      </ModalForms>
    </Box>
  );
};
