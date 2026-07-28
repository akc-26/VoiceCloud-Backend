import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import EditIcon from '@mui/icons-material/Edit';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { ModalForms } from '../components/common/ModalForms';
import { RichTextEditorWrapper } from '../components/common/RichTextEditorWrapper';
import { useNotificationsStore } from '../store/notifications.store';

interface CmsPageItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: string;
  updatedAt: string;
}

export const CmsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [pages, setPages] = useState<CmsPageItem[]>([
    { id: 'cms-1', slug: 'terms-of-service', title: 'Terms of Service', content: '## VoiceCloud Terms of Service\nWelcome to VoiceCloud...', status: 'published', updatedAt: '2026-07-20' },
    { id: 'cms-2', slug: 'privacy-policy', title: 'Privacy Policy', content: '## Privacy Policy\nYour privacy is paramount...', status: 'published', updatedAt: '2026-07-21' },
  ]);

  const [selectedPage, setSelectedPage] = useState<CmsPageItem | null>(null);
  const [editorContent, setEditorContent] = useState('');

  const handleEditClick = (page: CmsPageItem) => {
    setSelectedPage(page);
    setEditorContent(page.content);
  };

  const handleSaveContent = () => {
    if (!selectedPage) return;
    setPages((prev) =>
      prev.map((p) => (p.id === selectedPage.id ? { ...p, content: editorContent, updatedAt: new Date().toISOString().split('T')[0] } : p)),
    );
    addToast('success', `Updated CMS page "${selectedPage.title}"`);
    setSelectedPage(null);
  };

  const columns: Column<CmsPageItem>[] = [
    {
      id: 'title',
      label: 'Page Title',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ArticleIcon color="primary" />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.title}</Typography>
            <Typography variant="caption" color="text.secondary">/{row.slug}</Typography>
          </Box>
        </Box>
      ),
    },
    { id: 'status', label: 'Publication Status', render: (row) => <StatusBadge status={row.status} /> },
    { id: 'updatedAt', label: 'Last Modified' },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleEditClick(row)}>
          Edit Page
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>CMS Content Management</Typography>
        <Typography variant="body2" color="text.secondary">Manage legal documents, terms of service, help desk articles, and FAQ pages</Typography>
      </Box>

      <DataTable columns={columns} rows={pages} />

      <ModalForms
        open={Boolean(selectedPage)}
        title={`Edit CMS Page: ${selectedPage?.title}`}
        onClose={() => setSelectedPage(null)}
        onSubmit={handleSaveContent}
        submitText="Publish Content"
        maxWidth="md"
      >
        <RichTextEditorWrapper value={editorContent} onChange={setEditorContent} label="Markdown Content Editor" />
      </ModalForms>
    </Box>
  );
};
