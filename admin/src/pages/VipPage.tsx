import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  IconButton,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import StarIcon from '@mui/icons-material/Star';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShieldIcon from '@mui/icons-material/Shield';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  vipAdminService,
  VipTierData,
  VipBenefitData,
  VipRewardData,
} from '../services/vip.service';
import { useNotificationsStore } from '../store/notifications.store';

export const VipPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [tiers, setTiers] = useState<VipTierData[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [benefits, setBenefits] = useState<VipBenefitData[]>([]);
  const [rewards, setRewards] = useState<VipRewardData[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);

  // Modal Dialog states
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Partial<VipTierData> | null>(
    null,
  );

  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] =
    useState<Partial<VipBenefitData> | null>(null);

  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] =
    useState<Partial<VipRewardData> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sData, tData, mData, bData, rData, renData] = await Promise.all([
        vipAdminService.getVipDashboardStats(),
        vipAdminService.getTiers(),
        vipAdminService.getMemberships(),
        vipAdminService.getBenefits(),
        vipAdminService.getRewards(),
        vipAdminService.getUpcomingRenewals(),
      ]);
      setStats(sData);
      setTiers(tData);
      setMemberships(mData);
      setBenefits(bData);
      setRewards(rData);
      setRenewals(renData);
    } catch (error: any) {
      addToast(
        'error',
        error.message || 'Failed to load VIP administration data',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Tier Handlers ---
  const handleOpenTierDialog = (tier?: VipTierData) => {
    setEditingTier(
      tier || {
        name: '',
        level: 1,
        monthlyPrice: 9.99,
        activationStatus: true,
      },
    );
    setTierDialogOpen(true);
  };

  const handleSaveTier = async () => {
    if (!editingTier?.name) return;
    setLoading(true);
    try {
      if (editingTier.id) {
        await vipAdminService.updateTier(editingTier.id, editingTier);
      } else {
        await vipAdminService.createTier(editingTier);
      }
      setTierDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to save VIP tier');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTier = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this VIP Tier?'))
      return;
    setLoading(true);
    try {
      await vipAdminService.deleteTier(id);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to delete VIP tier');
    } finally {
      setLoading(false);
    }
  };

  // --- Benefit Handlers ---
  const handleOpenBenefitDialog = (b?: VipBenefitData) => {
    setEditingBenefit(
      b || {
        key: '',
        name: '',
        minVipLevel: 1,
        category: 'visual',
        isActive: true,
      },
    );
    setBenefitDialogOpen(true);
  };

  const handleSaveBenefit = async () => {
    if (!editingBenefit?.key || !editingBenefit?.name) return;
    setLoading(true);
    try {
      if (editingBenefit.id) {
        await vipAdminService.updateBenefit(editingBenefit.id, editingBenefit);
      } else {
        await vipAdminService.createBenefit(editingBenefit);
      }
      setBenefitDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to save VIP benefit');
    } finally {
      setLoading(false);
    }
  };

  // --- Reward Handlers ---
  const handleOpenRewardDialog = (r?: VipRewardData) => {
    setEditingReward(
      r || {
        title: '',
        rewardType: 'DAILY',
        minVipLevel: 1,
        coins: 50,
        exp: 100,
        isActive: true,
      },
    );
    setRewardDialogOpen(true);
  };

  const handleSaveReward = async () => {
    if (!editingReward?.title) return;
    setLoading(true);
    try {
      if (editingReward.id) {
        await vipAdminService.updateReward(editingReward.id, editingReward);
      } else {
        await vipAdminService.createReward(editingReward);
      }
      setRewardDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || 'Failed to save VIP reward');
    } finally {
      setLoading(false);
    }
  };

  // --- Columns Definitions ---
  const tierColumns: Column<VipTierData>[] = [
    {
      id: 'level',
      label: 'Level',
      render: (row) => (
        <Chip
          label={`VIP ${row.level}`}
          size="small"
          sx={{
            fontWeight: 800,
            bgcolor: row.colorTheme || '#FFD700',
            color: '#000',
          }}
        />
      ),
    },
    {
      id: 'name',
      label: 'Tier Name',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WorkspacePremiumIcon sx={{ color: row.colorTheme || '#FFD700' }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {row.name}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'monthlyPrice',
      label: 'Monthly',
      render: (row) => `$${Number(row.monthlyPrice || 0).toFixed(2)}`,
    },
    {
      id: 'quarterlyPrice',
      label: 'Quarterly',
      render: (row) => `$${Number(row.quarterlyPrice || 0).toFixed(2)}`,
    },
    {
      id: 'yearlyPrice',
      label: 'Yearly',
      render: (row) => `$${Number(row.yearlyPrice || 0).toFixed(2)}`,
    },
    {
      id: 'badge',
      label: 'Badge',
      render: (row) => (
        <Chip
          label={row.badge || 'Default Badge'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge
          status={row.activationStatus || row.isActive ? 'active' : 'inactive'}
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleOpenTierDialog(row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteTier(row.id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const membershipColumns: Column<any>[] = [
    {
      id: 'userId',
      label: 'User ID',
      render: (row) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {row.userId}
        </Typography>
      ),
    },
    {
      id: 'tierName',
      label: 'Tier',
      render: (row) => (
        <Chip
          label={row.tierName || `VIP ${row.level}`}
          size="small"
          color="warning"
        />
      ),
    },
    { id: 'level', label: 'Level', render: (row) => `L${row.level}` },
    {
      id: 'cycle',
      label: 'Cycle',
      render: (row) => row.subscriptionCycle || 'MONTHLY',
    },
    {
      id: 'expiresAt',
      label: 'Expires At',
      render: (row) => new Date(row.expiresAt).toLocaleDateString(),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge status={row.status === 'ACTIVE' ? 'active' : 'expired'} />
      ),
    },
  ];

  const benefitColumns: Column<VipBenefitData>[] = [
    {
      id: 'key',
      label: 'Key',
      render: (row) => <Chip label={row.key} size="small" variant="outlined" />,
    },
    {
      id: 'name',
      label: 'Benefit Name',
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {row.name}
        </Typography>
      ),
    },
    {
      id: 'category',
      label: 'Category',
      render: (row) => <Chip label={row.category} size="small" color="info" />,
    },
    {
      id: 'minVipLevel',
      label: 'Min Level',
      render: (row) => `VIP ${row.minVipLevel}+`,
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <IconButton
          size="small"
          color="primary"
          onClick={() => handleOpenBenefitDialog(row)}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const rewardColumns: Column<VipRewardData>[] = [
    {
      id: 'title',
      label: 'Title',
      render: (row) => (
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {row.title}
        </Typography>
      ),
    },
    {
      id: 'rewardType',
      label: 'Type',
      render: (row) => (
        <Chip
          label={row.rewardType}
          size="small"
          color={
            row.rewardType === 'DAILY'
              ? 'success'
              : row.rewardType === 'WEEKLY'
                ? 'warning'
                : 'primary'
          }
        />
      ),
    },
    {
      id: 'minVipLevel',
      label: 'Min Level',
      render: (row) => `VIP ${row.minVipLevel}+`,
    },
    { id: 'coins', label: 'Coins', render: (row) => `${row.coins} Coins` },
    { id: 'exp', label: 'VIP EXP', render: (row) => `+${row.exp} EXP` },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <IconButton
          size="small"
          color="primary"
          onClick={() => handleOpenRewardDialog(row)}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
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
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <WorkspacePremiumIcon color="warning" fontSize="large" />
            VIP Membership Platform
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage VIP Tiers 1-10, Benefits Engine, Dynamic Badges, Daily
            Rewards, and Revenue Analytics
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          disabled={loading}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, val) => setTabIndex(val)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<WorkspacePremiumIcon />}
            label="VIP Dashboard"
            iconPosition="start"
          />
          <Tab
            icon={<StarIcon />}
            label="Tier Management (1-10)"
            iconPosition="start"
          />
          <Tab
            icon={<PeopleIcon />}
            label="Membership Management"
            iconPosition="start"
          />
          <Tab
            icon={<ShieldIcon />}
            label="Benefit Configuration"
            iconPosition="start"
          />
          <Tab
            icon={<CardGiftcardIcon />}
            label="Rewards Management"
            iconPosition="start"
          />
          <Tab
            icon={<AttachMoneyIcon />}
            label="Revenue Analytics"
            iconPosition="start"
          />
          <Tab
            icon={<RefreshIcon />}
            label="Renewal Monitoring"
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* TAB 0: VIP Dashboard */}
      {tabIndex === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent
                  sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Active VIP Members
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {stats?.activeMembers ||
                        memberships.filter((m) => m.status === 'ACTIVE').length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent
                  sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <AttachMoneyIcon color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Revenue
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      ${Number(stats?.totalRevenue || 0).toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent
                  sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <ShieldIcon color="warning" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Retention Rate
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {stats?.retentionRatePercent || 100}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent
                  sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <CardGiftcardIcon color="secondary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Reward Claims
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {stats?.totalClaims || 0}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              VIP Tier Distribution (Tiers 1–10)
            </Typography>
            <Grid container spacing={2}>
              {tiers.map((tier) => (
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={tier.id}>
                  <Card
                    variant="outlined"
                    sx={{ borderColor: tier.colorTheme || '#ccc' }}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Chip
                        label={`Level ${tier.level}`}
                        size="small"
                        sx={{
                          mb: 1,
                          bgcolor: tier.colorTheme || '#FFD700',
                          color: '#000',
                          fontWeight: 800,
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {tier.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ${tier.monthlyPrice}/mo
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Box>
      )}

      {/* TAB 1: Tier Management */}
      {tabIndex === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Configurable VIP Tiers (1 to 10)
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenTierDialog()}
            >
              Add VIP Tier
            </Button>
          </Box>
          <DataTable columns={tierColumns} rows={tiers} />
        </Box>
      )}

      {/* TAB 2: Membership Management */}
      {tabIndex === 2 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            User VIP Memberships
          </Typography>
          <DataTable columns={membershipColumns} rows={memberships} />
        </Box>
      )}

      {/* TAB 3: Benefit Configuration */}
      {tabIndex === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Configurable VIP Benefits Catalog
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenBenefitDialog()}
            >
              Add Benefit
            </Button>
          </Box>
          <DataTable columns={benefitColumns} rows={benefits} />
        </Box>
      )}

      {/* TAB 4: Rewards Management */}
      {tabIndex === 4 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              VIP Daily, Weekly & Monthly Rewards
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenRewardDialog()}
            >
              Add Reward
            </Button>
          </Box>
          <DataTable columns={rewardColumns} rows={rewards} />
        </Box>
      )}

      {/* TAB 5: Revenue Analytics */}
      {tabIndex === 5 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            VIP Subscription Revenue Breakdown
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Monthly Subscriptions
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: 'primary.main', my: 1 }}
                >
                  ${Number(stats?.revenueByCycle?.MONTHLY || 0).toFixed(2)}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Quarterly Subscriptions
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: 'warning.main', my: 1 }}
                >
                  ${Number(stats?.revenueByCycle?.QUARTERLY || 0).toFixed(2)}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Yearly Subscriptions
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: 'success.main', my: 1 }}
                >
                  ${Number(stats?.revenueByCycle?.YEARLY || 0).toFixed(2)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TAB 6: Renewal Monitoring */}
      {tabIndex === 6 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Upcoming Expirations & Renewal Queue
          </Typography>
          <DataTable columns={membershipColumns} rows={renewals} />
        </Box>
      )}

      {/* Tier Add/Edit Modal */}
      <Dialog
        open={tierDialogOpen}
        onClose={() => setTierDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTier?.id ? 'Edit VIP Tier' : 'Add VIP Tier'}
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}
        >
          <TextField
            label="Tier Name"
            value={editingTier?.name || ''}
            onChange={(e) =>
              setEditingTier({ ...editingTier, name: e.target.value })
            }
            fullWidth
          />
          <TextField
            label="VIP Level (1 - 10)"
            type="number"
            value={editingTier?.level || 1}
            onChange={(e) =>
              setEditingTier({ ...editingTier, level: Number(e.target.value) })
            }
            fullWidth
          />
          <TextField
            label="Badge Name"
            value={editingTier?.badge || ''}
            onChange={(e) =>
              setEditingTier({ ...editingTier, badge: e.target.value })
            }
            fullWidth
          />
          <TextField
            label="Color Theme (Hex)"
            value={editingTier?.colorTheme || '#FFD700'}
            onChange={(e) =>
              setEditingTier({ ...editingTier, colorTheme: e.target.value })
            }
            fullWidth
          />
          <Grid container spacing={2}>
            <Grid size={4}>
              <TextField
                label="Monthly Price"
                type="number"
                value={editingTier?.monthlyPrice || 0}
                onChange={(e) =>
                  setEditingTier({
                    ...editingTier,
                    monthlyPrice: Number(e.target.value),
                  })
                }
                fullWidth
              />
            </Grid>
            <Grid size={4}>
              <TextField
                label="Quarterly Price"
                type="number"
                value={editingTier?.quarterlyPrice || 0}
                onChange={(e) =>
                  setEditingTier({
                    ...editingTier,
                    quarterlyPrice: Number(e.target.value),
                  })
                }
                fullWidth
              />
            </Grid>
            <Grid size={4}>
              <TextField
                label="Yearly Price"
                type="number"
                value={editingTier?.yearlyPrice || 0}
                onChange={(e) =>
                  setEditingTier({
                    ...editingTier,
                    yearlyPrice: Number(e.target.value),
                  })
                }
                fullWidth
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={
              <Switch
                checked={editingTier?.activationStatus ?? true}
                onChange={(e) =>
                  setEditingTier({
                    ...editingTier,
                    activationStatus: e.target.checked,
                  })
                }
              />
            }
            label="Tier Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTierDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTier}>
            Save Tier
          </Button>
        </DialogActions>
      </Dialog>

      {/* Benefit Modal */}
      <Dialog
        open={benefitDialogOpen}
        onClose={() => setBenefitDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingBenefit?.id ? 'Edit Benefit' : 'Add Benefit'}
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}
        >
          <TextField
            label="Benefit Key (unique identifier)"
            value={editingBenefit?.key || ''}
            onChange={(e) =>
              setEditingBenefit({ ...editingBenefit, key: e.target.value })
            }
            fullWidth
          />
          <TextField
            label="Benefit Name"
            value={editingBenefit?.name || ''}
            onChange={(e) =>
              setEditingBenefit({ ...editingBenefit, name: e.target.value })
            }
            fullWidth
          />
          <TextField
            label="Minimum VIP Level"
            type="number"
            value={editingBenefit?.minVipLevel || 1}
            onChange={(e) =>
              setEditingBenefit({
                ...editingBenefit,
                minVipLevel: Number(e.target.value),
              })
            }
            fullWidth
          />
          <TextField
            label="Category"
            value={editingBenefit?.category || 'visual'}
            onChange={(e) =>
              setEditingBenefit({ ...editingBenefit, category: e.target.value })
            }
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={editingBenefit?.isActive ?? true}
                onChange={(e) =>
                  setEditingBenefit({
                    ...editingBenefit,
                    isActive: e.target.checked,
                  })
                }
              />
            }
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBenefitDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveBenefit}>
            Save Benefit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reward Modal */}
      <Dialog
        open={rewardDialogOpen}
        onClose={() => setRewardDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingReward?.id ? 'Edit Reward' : 'Add Reward'}
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}
        >
          <TextField
            label="Reward Title"
            value={editingReward?.title || ''}
            onChange={(e) =>
              setEditingReward({ ...editingReward, title: e.target.value })
            }
            fullWidth
          />
          <TextField
            select
            label="Reward Frequency Type"
            value={editingReward?.rewardType || 'DAILY'}
            onChange={(e) =>
              setEditingReward({
                ...editingReward,
                rewardType: e.target.value as any,
              })
            }
            fullWidth
          >
            <MenuItem value="DAILY">Daily Reward</MenuItem>
            <MenuItem value="WEEKLY">Weekly Reward</MenuItem>
            <MenuItem value="MONTHLY">Monthly Reward</MenuItem>
          </TextField>
          <TextField
            label="Minimum VIP Level"
            type="number"
            value={editingReward?.minVipLevel || 1}
            onChange={(e) =>
              setEditingReward({
                ...editingReward,
                minVipLevel: Number(e.target.value),
              })
            }
            fullWidth
          />
          <Grid container spacing={2}>
            <Grid size={6}>
              <TextField
                label="Coins Amount"
                type="number"
                value={editingReward?.coins || 0}
                onChange={(e) =>
                  setEditingReward({
                    ...editingReward,
                    coins: Number(e.target.value),
                  })
                }
                fullWidth
              />
            </Grid>
            <Grid size={6}>
              <TextField
                label="EXP Amount"
                type="number"
                value={editingReward?.exp || 0}
                onChange={(e) =>
                  setEditingReward({
                    ...editingReward,
                    exp: Number(e.target.value),
                  })
                }
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRewardDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveReward}>
            Save Reward
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VipPage;
