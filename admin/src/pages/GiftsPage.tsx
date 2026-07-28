import React, { useState } from 'react';
import { Box, Typography, Button, Avatar } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import AddIcon from '@mui/icons-material/Add';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { ModalForms } from '../components/common/ModalForms';
import { FormBuilder, FormField } from '../components/common/FormBuilder';
import { useNotificationsStore } from '../store/notifications.store';

interface GiftCatalogItem {
  id: string;
  name: string;
  coinPrice: number;
  category: string;
  isAnimated: boolean;
  status: string;
}

export const GiftsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [gifts, setGifts] = useState<GiftCatalogItem[]>([
    { id: 'gift-1', name: 'Golden Microphone', coinPrice: 100, category: 'Standard', isAnimated: false, status: 'active' },
    { id: 'gift-2', name: 'Cyber Luxury Sports Car', coinPrice: 5000, category: 'Luxury', isAnimated: true, status: 'active' },
    { id: 'gift-3', name: 'Diamond Voice Crown', coinPrice: 10000, category: 'VIP Exclusive', isAnimated: true, status: 'active' },
  ]);

  const [modalOpen, setModalOpen] = useState(false);

  const formFields: FormField[] = [
    { name: 'name', label: 'Gift Title', type: 'text', required: true, gridSpan: 6 },
    { name: 'coinPrice', label: 'Coin Value', type: 'number', required: true, gridSpan: 6 },
    { name: 'category', label: 'Gift Category', type: 'select', options: [{ label: 'Standard', value: 'Standard' }, { label: 'Luxury', value: 'Luxury' }, { label: 'VIP Exclusive', value: 'VIP Exclusive' }], gridSpan: 6 },
    { name: 'isAnimated', label: 'SVGA Animation Enabled', type: 'switch', gridSpan: 6 },
  ];

  const handleCreateGift = (data: any) => {
    const newItem: GiftCatalogItem = {
      id: `gift-${Date.now()}`,
      name: data.name,
      coinPrice: Number(data.coinPrice),
      category: data.category || 'Standard',
      isAnimated: Boolean(data.isAnimated),
      status: 'active',
    };
    setGifts((prev) => [newItem, ...prev]);
    addToast('success', `Created gift "${newItem.name}"`);
    setModalOpen(false);
  };

  const columns: Column<GiftCatalogItem>[] = [
    {
      id: 'name',
      label: 'Gift Item',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main' }}>
            <CardGiftcardIcon />
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">{row.category}</Typography>
          </Box>
        </Box>
      ),
    },
    { id: 'coinPrice', label: 'Price (Coins)', render: (row) => `${row.coinPrice} Coins` },
    { id: 'isAnimated', label: 'Animation', render: (row) => (row.isAnimated ? 'SVGA / Lottie' : 'Static Image') },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Virtual Gift Store Catalog</Typography>
          <Typography variant="body2" color="text.secondary">Configure virtual gift items, coin prices, animations, and special room rewards</Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
          Create Gift Item
        </Button>
      </Box>

      <DataTable columns={columns} rows={gifts} />

      <ModalForms open={modalOpen} title="Create Virtual Gift Item" onClose={() => setModalOpen(false)}>
        <FormBuilder fields={formFields} onSubmit={handleCreateGift} submitText="Save Gift Item" />
      </ModalForms>
    </Box>
  );
};
