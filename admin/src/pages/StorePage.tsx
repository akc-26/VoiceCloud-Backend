import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  CircularProgress,
  Tabs,
  Tab,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShoppingBag as StoreIcon,
  CardGiftcard as GrantIcon,
  TrendingUp as AnalyticsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { adminStoreService, StoreItem, StoreAnalytics } from '../services/store.service';
import { useNotificationsStore } from '../store/notifications.store';

export const StorePage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<StoreItem> | null>(null);

  // Grant Item Modal state
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantItemId, setGrantItemId] = useState('');
  const [grantDuration, setGrantDuration] = useState(30);
  const [grantReason, setGrantReason] = useState('');

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await adminStoreService.getItems({
        category: categoryFilter || undefined,
        search: searchQuery || undefined,
      });
      setItems(res.items || []);
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to fetch store catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await adminStoreService.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      addToast('Failed to fetch store analytics', 'error');
    }
  };

  useEffect(() => {
    fetchCatalog();
    fetchAnalytics();
  }, [categoryFilter]);

  const handleOpenCreateItem = () => {
    setEditingItem({
      name: '',
      description: '',
      category: 'AVATAR_FRAME',
      rarity: 'COMMON',
      iconUrl: 'https://cdn.voicecloud.app/store/icons/default.png',
      assetUrl: 'https://cdn.voicecloud.app/store/assets/default.svga',
      priceCoins: 500,
      priceDiamonds: 0,
      isVipExclusive: false,
      minVipLevel: 0,
      isLimitedEdition: false,
      stockQuantity: 999,
      isActive: true,
    });
    setItemModalOpen(true);
  };

  const handleOpenEditItem = (item: StoreItem) => {
    setEditingItem(item);
    setItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!editingItem?.name || !editingItem?.iconUrl || !editingItem?.assetUrl) {
      addToast('Please fill in required fields (Name, Icon URL, Asset URL)', 'warning');
      return;
    }

    try {
      if (editingItem.id) {
        await adminStoreService.updateItem(editingItem.id, editingItem);
        addToast('Store item updated successfully', 'success');
      } else {
        await adminStoreService.createItem(editingItem);
        addToast('Store item created successfully', 'success');
      }
      setItemModalOpen(false);
      fetchCatalog();
      fetchAnalytics();
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to save store item', 'error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this store item?')) return;
    try {
      await adminStoreService.deleteItem(id);
      addToast('Store item deactivated', 'info');
      fetchCatalog();
    } catch (err: any) {
      addToast('Failed to deactivate store item', 'error');
    }
  };

  const handleGrantItem = async () => {
    if (!grantUserId || !grantItemId) {
      addToast('Please provide User ID and select an Item', 'warning');
      return;
    }

    try {
      await adminStoreService.grantItem({
        userId: grantUserId,
        itemId: grantItemId,
        durationDays: Number(grantDuration),
        reason: grantReason,
      });
      addToast('Decor item granted to user successfully', 'success');
      setGrantModalOpen(false);
      setGrantUserId('');
      setGrantReason('');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to grant item', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <StoreIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Store & Personalization Mall
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phase 29: Avatar Frames, Chat Bubbles, Entrance Effects, Room Themes, Vehicles & Mall Management
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchCatalog}>
            Refresh
          </Button>
          <Button variant="outlined" color="secondary" startIcon={<GrantIcon />} onClick={() => setGrantModalOpen(true)}>
            Grant Item
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateItem}>
            New Store Item
          </Button>
        </Box>
      </Box>

      {/* Analytics Overview Cards */}
      {analytics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Total Catalog Items</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>{analytics.totalItems}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Total Store Sales</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>{analytics.totalTransactions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Coins Revenue</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'warning.main' }}>
                  🪙 {analytics.totalCoinsSpent.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Diamonds Revenue</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'secondary.main' }}>
                  💎 {analytics.totalDiamondsSpent.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter Toolbar */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            label="Category Filter"
            size="small"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Categories</MenuItem>
            <MenuItem value="AVATAR_FRAME">Avatar Frame</MenuItem>
            <MenuItem value="CHAT_BUBBLE">Chat Bubble</MenuItem>
            <MenuItem value="ENTRANCE_EFFECT">Entrance Effect</MenuItem>
            <MenuItem value="ROOM_THEME">Room Theme</MenuItem>
            <MenuItem value="VEHICLE_MOUNT">Vehicle / Mount</MenuItem>
            <MenuItem value="NOBILITY_BADGE">Nobility Badge</MenuItem>
            <MenuItem value="PROFILE_CARD_BG">Profile Card BG</MenuItem>
          </TextField>

          <TextField
            label="Search Item Name"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchCatalog()}
            sx={{ minWidth: 250 }}
          />

          <Button variant="contained" color="inherit" onClick={fetchCatalog}>
            Search
          </Button>
        </Box>
      </Card>

      {/* Catalog Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Icon</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Name & Category</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Rarity</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Prices</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>VIP / Stock</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No store items found in catalog. Create one using 'New Store Item'!
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Avatar src={item.iconUrl} alt={item.name} variant="rounded" sx={{ width: 44, height: 44 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                    <Chip label={item.category} size="small" variant="outlined" sx={{ mt: 0.5, fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.rarity}
                      size="small"
                      color={
                        item.rarity === 'LEGENDARY' ? 'warning' :
                        item.rarity === 'EPIC' ? 'secondary' :
                        item.rarity === 'RARE' ? 'primary' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">🪙 {item.priceCoins}</Typography>
                    {item.priceDiamonds > 0 && <Typography variant="caption" color="secondary">💎 {item.priceDiamonds}</Typography>}
                  </TableCell>
                  <TableCell>
                    {item.isVipExclusive ? (
                      <Chip label={`VIP Lvl ${item.minVipLevel}+`} size="small" color="secondary" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">Public</Typography>
                    )}
                    {item.isLimitedEdition && (
                      <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>Stock: {item.stockQuantity}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.isActive ? (
                      <Chip icon={<CheckIcon />} label="Active" color="success" size="small" />
                    ) : (
                      <Chip icon={<CancelIcon />} label="Inactive" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit Item">
                      <IconButton color="primary" onClick={() => handleOpenEditItem(item)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Deactivate Item">
                      <IconButton color="error" onClick={() => handleDeleteItem(item.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create / Edit Dialog */}
      <Dialog open={itemModalOpen} onClose={() => setItemModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingItem?.id ? 'Edit Store Item' : 'Create New Store Decor Item'}
        </DialogTitle>
        <DialogContent dividers>
          {editingItem && (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Item Name"
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  value={editingItem.category || 'AVATAR_FRAME'}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                >
                  <MenuItem value="AVATAR_FRAME">Avatar Frame</MenuItem>
                  <MenuItem value="CHAT_BUBBLE">Chat Bubble</MenuItem>
                  <MenuItem value="ENTRANCE_EFFECT">Entrance Effect</MenuItem>
                  <MenuItem value="ROOM_THEME">Room Theme</MenuItem>
                  <MenuItem value="VEHICLE_MOUNT">Vehicle / Mount</MenuItem>
                  <MenuItem value="NOBILITY_BADGE">Nobility Badge</MenuItem>
                  <MenuItem value="PROFILE_CARD_BG">Profile Card BG</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Rarity"
                  value={editingItem.rarity || 'COMMON'}
                  onChange={(e) => setEditingItem({ ...editingItem, rarity: e.target.value as any })}
                >
                  <MenuItem value="COMMON">Common</MenuItem>
                  <MenuItem value="RARE">Rare</MenuItem>
                  <MenuItem value="EPIC">Epic</MenuItem>
                  <MenuItem value="LEGENDARY">Legendary</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Default Coin Price (30 Days)"
                  value={editingItem.priceCoins ?? 500}
                  onChange={(e) => setEditingItem({ ...editingItem, priceCoins: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Icon Thumbnail URL"
                  value={editingItem.iconUrl || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, iconUrl: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Asset File URL (SVGA/PNG/JSON)"
                  value={editingItem.assetUrl || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, assetUrl: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!editingItem.isVipExclusive}
                      onChange={(e) => setEditingItem({ ...editingItem, isVipExclusive: e.target.checked })}
                    />
                  }
                  label="VIP Exclusive Item"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!editingItem.isActive}
                      onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                    />
                  }
                  label="Active in Store"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveItem}>Save Store Item</Button>
        </DialogActions>
      </Dialog>

      {/* Grant Item Dialog */}
      <Dialog open={grantModalOpen} onClose={() => setGrantModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Grant Store Decor Item to User</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="User ID"
              placeholder="e.g. uuid-user-123"
              value={grantUserId}
              onChange={(e) => setGrantUserId(e.target.value)}
            />

            <TextField
              select
              fullWidth
              label="Select Decor Item"
              value={grantItemId}
              onChange={(e) => setGrantItemId(e.target.value)}
            >
              <MenuItem value="">-- Choose Item --</MenuItem>
              {items.map((i) => (
                <MenuItem key={i.id} value={i.id}>
                  {i.name} ({i.category})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              type="number"
              label="Grant Duration (Days, -1 for Permanent)"
              value={grantDuration}
              onChange={(e) => setGrantDuration(Number(e.target.value))}
            />

            <TextField
              fullWidth
              label="Reason / Admin Note"
              placeholder="e.g. Event Reward, VIP Bonus"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleGrantItem}>
            Grant Item Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
