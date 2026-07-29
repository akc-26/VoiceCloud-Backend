import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Tabs,
  Tab,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  IconButton,
  Switch,
  TextField,
  MenuItem,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CategoryIcon from '@mui/icons-material/Category';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EqualizerIcon from '@mui/icons-material/Equalizer';
import EventIcon from '@mui/icons-material/Event';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { ModalForms } from '../components/common/ModalForms';
import { FormBuilder, FormField } from '../components/common/FormBuilder';
import { useNotificationsStore } from '../store/notifications.store';

interface GiftItem {
  id: string;
  name: string;
  description?: string;
  type: string;
  rarity: string;
  category: string;
  coinPrice: number;
  creatorEarningsPercentage: number;
  agencyEarningsPercentage: number;
  isAnimated: boolean;
  status: 'active' | 'disabled' | 'archived';
  isLimitedEdition: boolean;
  totalStock?: number;
  remainingStock?: number;
  isSeasonal: boolean;
  seasonTag?: string;
  sortOrder: number;
}

interface GiftCategoryItem {
  id: string;
  name: string;
  slug: string;
  giftCount: number;
  sortOrder: number;
  status: string;
}

export const GiftsPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [activeTab, setActiveTab] = useState(0);

  // Gifts state
  const [gifts, setGifts] = useState<GiftItem[]>([
    {
      id: 'gift-1',
      name: 'Golden Microphone',
      description: 'Classic mic for star hosts',
      type: 'static',
      rarity: 'common',
      category: 'Popular',
      coinPrice: 100,
      creatorEarningsPercentage: 70,
      agencyEarningsPercentage: 10,
      isAnimated: false,
      status: 'active',
      isLimitedEdition: false,
      isSeasonal: false,
      sortOrder: 1,
    },
    {
      id: 'gift-2',
      name: 'Cyber Sports Car',
      description: 'Fullscreen animated sports car arrival',
      type: 'svga',
      rarity: 'epic',
      category: 'Trending',
      coinPrice: 5000,
      creatorEarningsPercentage: 70,
      agencyEarningsPercentage: 10,
      isAnimated: true,
      status: 'active',
      isLimitedEdition: false,
      isSeasonal: false,
      sortOrder: 2,
    },
    {
      id: 'gift-3',
      name: 'Diamond Voice Crown',
      description: 'Legendary crown FX for top VIPs',
      type: 'lottie',
      rarity: 'legendary',
      category: 'VIP-only',
      coinPrice: 10000,
      creatorEarningsPercentage: 75,
      agencyEarningsPercentage: 10,
      isAnimated: true,
      status: 'active',
      isLimitedEdition: true,
      totalStock: 50,
      remainingStock: 12,
      isSeasonal: false,
      sortOrder: 3,
    },
    {
      id: 'gift-4',
      name: 'Summer Dragon Firework',
      description: 'Seasonal festival firework celebration',
      type: 'video',
      rarity: 'mythic',
      category: 'Seasonal',
      coinPrice: 2000,
      creatorEarningsPercentage: 70,
      agencyEarningsPercentage: 10,
      isAnimated: true,
      status: 'active',
      isLimitedEdition: false,
      isSeasonal: true,
      seasonTag: 'summer_2026',
      sortOrder: 4,
    },
  ]);

  // Categories state
  const [categories, setCategories] = useState<GiftCategoryItem[]>([
    { id: 'cat-1', name: 'Popular', slug: 'popular', giftCount: 14, sortOrder: 1, status: 'active' },
    { id: 'cat-2', name: 'Trending', slug: 'trending', giftCount: 8, sortOrder: 2, status: 'active' },
    { id: 'cat-3', name: 'Premium', slug: 'premium', giftCount: 12, sortOrder: 3, status: 'active' },
    { id: 'cat-4', name: 'Seasonal', slug: 'seasonal', giftCount: 6, sortOrder: 4, status: 'active' },
    { id: 'cat-5', name: 'VIP-only', slug: 'vip-only', giftCount: 5, sortOrder: 5, status: 'active' },
    { id: 'cat-6', name: 'Host-exclusive', slug: 'host-exclusive', giftCount: 3, sortOrder: 6, status: 'active' },
  ]);

  // Combo config state
  const [comboConfig, setComboConfig] = useState({
    timeoutSeconds: 10,
    tier1Min: 6,
    tier1Multiplier: 1.2,
    tier2Min: 11,
    tier2Multiplier: 1.5,
    tier3Min: 21,
    tier3Multiplier: 2.0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'gift' | 'category'>('gift');

  const giftFormFields: FormField[] = [
    { name: 'name', label: 'Gift Title', type: 'text', required: true, gridSpan: 6 },
    { name: 'coinPrice', label: 'Coin Value', type: 'number', required: true, gridSpan: 6 },
    {
      name: 'category',
      label: 'Gift Category',
      type: 'select',
      options: categories.map((c) => ({ label: c.name, value: c.name })),
      gridSpan: 6,
    },
    {
      name: 'type',
      label: 'Animation Format',
      type: 'select',
      options: [
        { label: 'Static Image', value: 'static' },
        { label: 'SVGA Animation', value: 'svga' },
        { label: 'Lottie FX', value: 'lottie' },
        { label: 'Video MP4/WebM', value: 'video' },
      ],
      gridSpan: 6,
    },
    {
      name: 'rarity',
      label: 'Rarity Tier',
      type: 'select',
      options: [
        { label: 'Common', value: 'common' },
        { label: 'Rare', value: 'rare' },
        { label: 'Epic', value: 'epic' },
        { label: 'Legendary', value: 'legendary' },
        { label: 'Mythic', value: 'mythic' },
      ],
      gridSpan: 6,
    },
    { name: 'creatorEarningsPercentage', label: 'Creator Earnings %', type: 'number', gridSpan: 3 },
    { name: 'agencyEarningsPercentage', label: 'Agency Share %', type: 'number', gridSpan: 3 },
  ];

  const categoryFormFields: FormField[] = [
    { name: 'name', label: 'Category Name', type: 'text', required: true, gridSpan: 6 },
    { name: 'slug', label: 'URL Slug', type: 'text', gridSpan: 6 },
    { name: 'sortOrder', label: 'Display Order', type: 'number', gridSpan: 6 },
  ];

  const handleCreateGift = (data: any) => {
    const newItem: GiftItem = {
      id: `gift-${Date.now()}`,
      name: data.name,
      coinPrice: Number(data.coinPrice),
      category: data.category || 'Popular',
      type: data.type || 'static',
      rarity: data.rarity || 'common',
      creatorEarningsPercentage: Number(data.creatorEarningsPercentage) || 70,
      agencyEarningsPercentage: Number(data.agencyEarningsPercentage) || 10,
      isAnimated: data.type !== 'static',
      status: 'active',
      isLimitedEdition: false,
      isSeasonal: false,
      sortOrder: gifts.length + 1,
    };
    setGifts((prev) => [newItem, ...prev]);
    addToast('success', `Created gift "${newItem.name}"`);
    setModalOpen(false);
  };

  const handleCreateCategory = (data: any) => {
    const newCat: GiftCategoryItem = {
      id: `cat-${Date.now()}`,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      giftCount: 0,
      sortOrder: categories.length + 1,
      status: 'active',
    };
    setCategories((prev) => [...prev, newCat]);
    addToast('success', `Created category "${newCat.name}"`);
    setModalOpen(false);
  };

  const toggleGiftStatus = (id: string) => {
    setGifts((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const nextStatus = g.status === 'active' ? 'disabled' : 'active';
          addToast('info', `Toggled "${g.name}" status to ${nextStatus}`);
          return { ...g, status: nextStatus };
        }
        return g;
      }),
    );
  };

  const archiveGift = (id: string) => {
    setGifts((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: 'archived' } : g)),
    );
    addToast('warning', 'Gift item archived');
  };

  const catalogColumns: Column<GiftItem>[] = [
    {
      id: 'name',
      label: 'Gift Item',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
            <CardGiftcardIcon />
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">{row.category} • {row.type.toUpperCase()}</Typography>
          </Box>
        </Box>
      ),
    },
    { id: 'coinPrice', label: 'Price', render: (row) => `${row.coinPrice} Coins` },
    { id: 'rarity', label: 'Rarity', render: (row) => <Chip label={row.rarity.toUpperCase()} size="small" variant="outlined" /> },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Switch size="small" checked={row.status === 'active'} onChange={() => toggleGiftStatus(row.id)} />
          <IconButton size="small" onClick={() => archiveGift(row.id)}>
            <ArchiveIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Phase 22 – Virtual Gift Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage Catalog, Categories, Pricing, Limited Inventory, Combos, Seasonal Tagging, and Analytics
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setModalType(activeTab === 1 ? 'category' : 'gift');
            setModalOpen(true);
          }}
        >
          {activeTab === 1 ? 'Create Category' : 'Create Gift Item'}
        </Button>
      </Box>

      {/* Tabs Bar */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab icon={<CardGiftcardIcon />} label="Gift Catalog" />
          <Tab icon={<CategoryIcon />} label="Categories" />
          <Tab icon={<AttachMoneyIcon />} label="Pricing" />
          <Tab icon={<InventoryIcon />} label="Inventory" />
          <Tab icon={<LocalFireDepartmentIcon />} label="Combos" />
          <Tab icon={<EqualizerIcon />} label="Statistics" />
          <Tab icon={<EventIcon />} label="Seasonal Gifts" />
          <Tab icon={<NewReleasesIcon />} label="Limited Gifts" />
        </Tabs>
      </Paper>

      {/* TAB 0: GIFT CATALOG */}
      {activeTab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Active Catalog Items</Typography>
          <DataTable columns={catalogColumns} rows={gifts} />
        </Paper>
      )}

      {/* TAB 1: CATEGORIES */}
      {activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Gift Categories</Typography>
          <DataTable
            columns={[
              { id: 'name', label: 'Category Name', render: (row) => <strong>{row.name}</strong> },
              { id: 'slug', label: 'Slug', render: (row) => row.slug },
              { id: 'giftCount', label: 'Gifts Count', render: (row) => `${row.giftCount} items` },
              { id: 'sortOrder', label: 'Display Order', render: (row) => `#${row.sortOrder}` },
              { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
            rows={categories}
          />
        </Paper>
      )}

      {/* TAB 2: PRICING */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          {gifts.map((gift) => (
            <Grid item xs={12} md={6} key={gift.id}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{gift.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Category: {gift.category} • Base Price: <strong>{gift.coinPrice} Coins</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Creator Share %"
                      type="number"
                      size="small"
                      value={gift.creatorEarningsPercentage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setGifts((prev) => prev.map((g) => (g.id === gift.id ? { ...g, creatorEarningsPercentage: val } : g)));
                      }}
                    />
                    <TextField
                      label="Agency Share %"
                      type="number"
                      size="small"
                      value={gift.agencyEarningsPercentage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setGifts((prev) => prev.map((g) => (g.id === gift.id ? { ...g, agencyEarningsPercentage: val } : g)));
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* TAB 3: INVENTORY */}
      {activeTab === 3 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Stock & Inventory Monitor</Typography>
          <DataTable
            columns={[
              { id: 'name', label: 'Gift Name', render: (row) => <strong>{row.name}</strong> },
              { id: 'type', label: 'Type', render: (row) => row.type },
              { id: 'isLimitedEdition', label: 'Limited Edition', render: (row) => (row.isLimitedEdition ? 'Yes' : 'Unlimited') },
              { id: 'totalStock', label: 'Initial Stock', render: (row) => row.totalStock || 'N/A' },
              { id: 'remainingStock', label: 'Remaining Stock', render: (row) => (row.remainingStock !== undefined ? `${row.remainingStock} units` : 'Unlimited') },
            ]}
            rows={gifts}
          />
        </Paper>
      )}

      {/* TAB 4: COMBOS */}
      {activeTab === 4 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Combo Engine Rules</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Combo Reset Timeout (Seconds)"
                type="number"
                value={comboConfig.timeoutSeconds}
                onChange={(e) => setComboConfig({ ...comboConfig, timeoutSeconds: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Tier 1 Threshold (1.2x Multiplier)"
                type="number"
                value={comboConfig.tier1Min}
                onChange={(e) => setComboConfig({ ...comboConfig, tier1Min: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Tier 2 Threshold (1.5x Multiplier)"
                type="number"
                value={comboConfig.tier2Min}
                onChange={(e) => setComboConfig({ ...comboConfig, tier2Min: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" onClick={() => addToast('success', 'Combo rules updated')}>
                Save Combo Rules
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* TAB 5: STATISTICS */}
      {activeTab === 5 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total Coins Spent Today</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>1,248,500</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Gifts Dispatched</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.main' }}>18,920</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Creator Payouts</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>873,950 💎</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">Active Combos Peak</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.main' }}>88x Streak</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 6: SEASONAL GIFTS */}
      {activeTab === 6 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Festival & Seasonal Gifts</Typography>
          <DataTable
            columns={[
              { id: 'name', label: 'Seasonal Item', render: (row) => <strong>{row.name}</strong> },
              { id: 'seasonTag', label: 'Season Tag', render: (row) => row.seasonTag || 'General' },
              { id: 'coinPrice', label: 'Price', render: (row) => `${row.coinPrice} Coins` },
              { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
            rows={gifts.filter((g) => g.isSeasonal)}
          />
        </Paper>
      )}

      {/* TAB 7: LIMITED GIFTS */}
      {activeTab === 7 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Limited Edition Flash Items</Typography>
          <DataTable
            columns={[
              { id: 'name', label: 'Limited Item', render: (row) => <strong>{row.name}</strong> },
              { id: 'coinPrice', label: 'Price', render: (row) => `${row.coinPrice} Coins` },
              { id: 'totalStock', label: 'Cap Stock', render: (row) => row.totalStock },
              { id: 'remainingStock', label: 'Available', render: (row) => `${row.remainingStock} units left` },
            ]}
            rows={gifts.filter((g) => g.isLimitedEdition)}
          />
        </Paper>
      )}

      {/* Modal Form */}
      <ModalForms
        open={modalOpen}
        title={modalType === 'category' ? 'Create Gift Category' : 'Create Virtual Gift Item'}
        onClose={() => setModalOpen(false)}
      >
        <FormBuilder
          fields={modalType === 'category' ? categoryFormFields : giftFormFields}
          onSubmit={modalType === 'category' ? handleCreateCategory : handleCreateGift}
          submitText={modalType === 'category' ? 'Save Category' : 'Save Gift Item'}
        />
      </ModalForms>
    </Box>
  );
};
