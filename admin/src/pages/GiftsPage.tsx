import React, { useCallback, useEffect, useState } from 'react';
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
  CircularProgress,
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

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { ModalForms } from '../components/common/ModalForms';
import { FormBuilder, FormField } from '../components/common/FormBuilder';
import { useNotificationsStore } from '../store/notifications.store';
import {
  giftsAdminService,
  GiftRevenueSummary,
} from '../services/gifts.service';

interface GiftItem {
  id: string;
  name: string;
  description?: string;
  type: string;
  rarity: string;
  category: string;
  coinPrice: number;
  creatorEarningsPercentage: number;
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

  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [categories, setCategories] = useState<GiftCategoryItem[]>([]);
  const [revenue, setRevenue] = useState<GiftRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, categoryList, revenueData] = await Promise.all([
        giftsAdminService.getCatalog(),
        giftsAdminService.getCategories(),
        giftsAdminService.getRevenue('daily'),
      ]);
      setGifts(
        catalog.map((gift) => ({
          id: gift.id,
          name: gift.name,
          description: gift.description || undefined,
          type: gift.type,
          rarity: gift.rarity,
          category: gift.category,
          coinPrice: Number(gift.coinPrice),
          creatorEarningsPercentage: Number(gift.creatorEarningsPercentage),
          isAnimated: gift.type !== 'static',
          status: gift.isArchived
            ? 'archived'
            : gift.isActive
              ? 'active'
              : 'disabled',
          isLimitedEdition: gift.isLimitedEdition,
          totalStock: gift.totalStock ?? undefined,
          remainingStock: gift.remainingStock ?? undefined,
          isSeasonal: gift.isSeasonal,
          seasonTag: gift.seasonTag || undefined,
          sortOrder: gift.sortOrder,
        })),
      );
      setCategories(
        categoryList.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          giftCount: catalog.filter((gift) => gift.category === category.name)
            .length,
          sortOrder: category.sortOrder,
          status: category.isActive ? 'active' : 'disabled',
        })),
      );
      setRevenue(revenueData);
    } catch (error: any) {
      addToast(
        'error',
        error.message || 'Failed to load gift administration data',
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combo config state
  const comboConfig = {
    timeoutSeconds: 10,
    tier1Min: 6,
    tier1Multiplier: 1.2,
    tier2Min: 11,
    tier2Multiplier: 1.5,
    tier3Min: 21,
    tier3Multiplier: 2.0,
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'gift' | 'category'>('gift');

  const giftFormFields: FormField[] = [
    {
      name: 'name',
      label: 'Gift Title',
      type: 'text',
      required: true,
      gridSpan: 6,
    },
    {
      name: 'coinPrice',
      label: 'Coin Value',
      type: 'number',
      required: true,
      gridSpan: 6,
    },
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
    {
      name: 'creatorEarningsPercentage',
      label: 'Creator Earnings %',
      type: 'number',
      gridSpan: 6,
    },
  ];

  const categoryFormFields: FormField[] = [
    {
      name: 'name',
      label: 'Category Name',
      type: 'text',
      required: true,
      gridSpan: 6,
    },
    { name: 'slug', label: 'URL Slug', type: 'text', gridSpan: 6 },
    { name: 'sortOrder', label: 'Display Order', type: 'number', gridSpan: 6 },
  ];

  const handleCreateGift = async (data: any) => {
    try {
      const creatorShare =
        data.creatorEarningsPercentage === '' ||
        data.creatorEarningsPercentage == null
          ? 70
          : Number(data.creatorEarningsPercentage);
      await giftsAdminService.createGift({
        name: data.name,
        coinPrice: Number(data.coinPrice),
        category: data.category || 'Popular',
        type: data.type || 'static',
        rarity: data.rarity || 'common',
        creatorEarningsPercentage: creatorShare,
        isActive: true,
        sortOrder: gifts.length + 1,
      });
      addToast('success', `Created gift "${data.name}"`);
      setModalOpen(false);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to create gift');
    }
  };

  const handleCreateCategory = async (data: any) => {
    try {
      await giftsAdminService.createCategory({
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
        sortOrder:
          data.sortOrder === '' || data.sortOrder == null
            ? categories.length + 1
            : Number(data.sortOrder),
        isActive: true,
      });
      addToast('success', `Created category "${data.name}"`);
      setModalOpen(false);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to create category');
    }
  };

  const toggleGiftStatus = async (id: string) => {
    const gift = gifts.find((item) => item.id === id);
    if (!gift || gift.status === 'archived') return;
    try {
      if (gift.status === 'active') await giftsAdminService.disableGift(id);
      else await giftsAdminService.enableGift(id);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to update gift status');
    }
  };

  const archiveGift = async (id: string) => {
    try {
      const gift = gifts.find((item) => item.id === id);
      if (gift?.status === 'archived') await giftsAdminService.restoreGift(id);
      else await giftsAdminService.archiveGift(id);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to update gift archive state');
    }
  };

  const persistCreatorShare = async (gift: GiftItem) => {
    try {
      await giftsAdminService.updateGift(gift.id, {
        creatorEarningsPercentage: Number(gift.creatorEarningsPercentage),
      });
      addToast('success', `Updated creator share for "${gift.name}"`);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to update gift pricing');
    }
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
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.category} • {row.type.toUpperCase()}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'coinPrice',
      label: 'Price',
      render: (row) => `${row.coinPrice} Coins`,
    },
    {
      id: 'rarity',
      label: 'Rarity',
      render: (row) => (
        <Chip
          label={row.rarity.toUpperCase()}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Switch
            size="small"
            checked={row.status === 'active'}
            disabled={row.status === 'archived'}
            onChange={() => toggleGiftStatus(row.id)}
          />
          <IconButton size="small" onClick={() => archiveGift(row.id)}>
            {row.status === 'archived' ? (
              <UnarchiveIcon fontSize="small" />
            ) : (
              <ArchiveIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Virtual Gift Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage Catalog, Categories, Pricing, Limited Inventory, Combos,
            Seasonal Tagging, and Analytics
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

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      )}

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
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Complete Persisted Catalog
          </Typography>
          <DataTable columns={catalogColumns} rows={gifts} />
        </Paper>
      )}

      {/* TAB 1: CATEGORIES */}
      {activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Gift Categories
          </Typography>
          <DataTable
            columns={[
              {
                id: 'name',
                label: 'Category Name',
                render: (row) => <strong>{row.name}</strong>,
              },
              { id: 'slug', label: 'Slug', render: (row) => row.slug },
              {
                id: 'giftCount',
                label: 'Gifts Count',
                render: (row) => `${row.giftCount} items`,
              },
              {
                id: 'sortOrder',
                label: 'Display Order',
                render: (row) => `#${row.sortOrder}`,
              },
              {
                id: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
            rows={categories}
          />
        </Paper>
      )}

      {/* TAB 2: PRICING */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          {gifts.map((gift) => (
            <Grid size={{ xs: 12, md: 6 }} key={gift.id}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {gift.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Category: {gift.category} • Base Price:{' '}
                    <strong>{gift.coinPrice} Coins</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Creator Share %"
                      type="number"
                      size="small"
                      value={gift.creatorEarningsPercentage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setGifts((prev) =>
                          prev.map((g) =>
                            g.id === gift.id
                              ? { ...g, creatorEarningsPercentage: val }
                              : g,
                          ),
                        );
                      }}
                      onBlur={() => persistCreatorShare(gift)}
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
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Stock & Inventory Monitor
          </Typography>
          <DataTable
            columns={[
              {
                id: 'name',
                label: 'Gift Name',
                render: (row) => <strong>{row.name}</strong>,
              },
              { id: 'type', label: 'Type', render: (row) => row.type },
              {
                id: 'isLimitedEdition',
                label: 'Limited Edition',
                render: (row) => (row.isLimitedEdition ? 'Yes' : 'Unlimited'),
              },
              {
                id: 'totalStock',
                label: 'Initial Stock',
                render: (row) => row.totalStock || 'N/A',
              },
              {
                id: 'remainingStock',
                label: 'Remaining Stock',
                render: (row) =>
                  row.remainingStock !== undefined
                    ? `${row.remainingStock} units`
                    : 'Unlimited',
              },
            ]}
            rows={gifts}
          />
        </Paper>
      )}

      {/* TAB 4: COMBOS */}
      {activeTab === 4 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Combo Engine Rules
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Combo Reset Timeout (Seconds)"
                type="number"
                value={comboConfig.timeoutSeconds}
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Tier 1 Threshold (1.2x Multiplier)"
                type="number"
                value={comboConfig.tier1Min}
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Tier 2 Threshold (1.5x Multiplier)"
                type="number"
                value={comboConfig.tier2Min}
                disabled
              />
            </Grid>
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary">
                These thresholds are enforced by the active Redis-backed runtime
                policy.
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* TAB 5: STATISTICS */}
      {activeTab === 5 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Gift Coin Volume (24h)
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: 'primary.main' }}
                >
                  {Number(revenue?.totalCoinsVolume || 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Settled Gift Transactions (24h)
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: 'secondary.main' }}
                >
                  {Number(revenue?.totalTransactions || 0).toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Creator Diamond Credits (24h)
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: 'success.main' }}
                >
                  {Number(revenue?.totalCreatorPayouts || 0).toLocaleString()}{' '}
                  💎
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Platform Net Coin Revenue (24h)
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: 'warning.main' }}
                >
                  {Number(revenue?.platformNetRevenue || 0).toLocaleString()}{' '}
                  Coins
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 6: SEASONAL GIFTS */}
      {activeTab === 6 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Festival & Seasonal Gifts
          </Typography>
          <DataTable
            columns={[
              {
                id: 'name',
                label: 'Seasonal Item',
                render: (row) => <strong>{row.name}</strong>,
              },
              {
                id: 'seasonTag',
                label: 'Season Tag',
                render: (row) => row.seasonTag || 'General',
              },
              {
                id: 'coinPrice',
                label: 'Price',
                render: (row) => `${row.coinPrice} Coins`,
              },
              {
                id: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
            ]}
            rows={gifts.filter((g) => g.isSeasonal)}
          />
        </Paper>
      )}

      {/* TAB 7: LIMITED GIFTS */}
      {activeTab === 7 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Limited Edition Flash Items
          </Typography>
          <DataTable
            columns={[
              {
                id: 'name',
                label: 'Limited Item',
                render: (row) => <strong>{row.name}</strong>,
              },
              {
                id: 'coinPrice',
                label: 'Price',
                render: (row) => `${row.coinPrice} Coins`,
              },
              {
                id: 'totalStock',
                label: 'Cap Stock',
                render: (row) => row.totalStock,
              },
              {
                id: 'remainingStock',
                label: 'Available',
                render: (row) => `${row.remainingStock} units left`,
              },
            ]}
            rows={gifts.filter((g) => g.isLimitedEdition)}
          />
        </Paper>
      )}

      {/* Modal Form */}
      <ModalForms
        open={modalOpen}
        title={
          modalType === 'category'
            ? 'Create Gift Category'
            : 'Create Virtual Gift Item'
        }
        onClose={() => setModalOpen(false)}
      >
        <FormBuilder
          fields={
            modalType === 'category' ? categoryFormFields : giftFormFields
          }
          onSubmit={
            modalType === 'category' ? handleCreateCategory : handleCreateGift
          }
          submitText={
            modalType === 'category' ? 'Save Category' : 'Save Gift Item'
          }
        />
      </ModalForms>
    </Box>
  );
};
