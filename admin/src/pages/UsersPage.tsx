import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Chip,
  IconButton,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import { DataTable, Column } from '../components/common/DataTable';
import { SearchBar } from '../components/common/SearchBar';
import { Filters } from '../components/common/Filters';
import { Pagination } from '../components/common/Pagination';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { DrawerPanels } from '../components/common/DrawerPanels';
import { usersService, UserItem, BadgeItem, VisitorLogItem } from '../services/users.service';
import { useNotificationsStore } from '../store/notifications.store';

export const UsersPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState(0);

  // Users State
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<UserItem | null>(null);

  // Level Dialog
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [levelType, setLevelType] = useState<'wealth' | 'charm'>('wealth');
  const [targetLevel, setTargetLevel] = useState(1);
  const [targetExp, setTargetExp] = useState(0);

  // Badges State
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [newBadgeCode, setNewBadgeCode] = useState('');
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeCategory, setNewBadgeCategory] = useState('wealth');
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [badgeToAssign, setBadgeToAssign] = useState('');

  // Settings State
  const [userSettings, setUserSettings] = useState<any>(null);

  // Visitor Logs State
  const [visitorLogs, setVisitorLogs] = useState<VisitorLogItem[]>([]);
  const [visitorStats, setVisitorStats] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersService.getUsers({ page, limit, search });
      if (data?.data) {
        setUsers(data.data);
        setTotalUsers(data.total || data.data.length);
      } else if (Array.isArray(data)) {
        setUsers(data);
        setTotalUsers(data.length);
      }
    } catch {
      // Keep state fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchBadges = async () => {
    try {
      const data = await usersService.getBadges();
      if (Array.isArray(data)) {
        setBadges(data);
      }
    } catch {
      // Fallback
    }
  };

  const fetchVisitorLogs = async () => {
    try {
      const logs = await usersService.getVisitorLogs();
      if (logs?.data) {
        setVisitorLogs(logs.data);
      }
      const stats = await usersService.getVisitorStats();
      setVisitorStats(stats);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (activeTab === 0) fetchUsers();
    if (activeTab === 1) fetchBadges();
    if (activeTab === 2) fetchVisitorLogs();
  }, [activeTab, page, limit, search]);

  const handleBanToggle = async () => {
    if (!userToBan) return;
    try {
      if (userToBan.isBanned) {
        await usersService.unbanUser(userToBan.id);
        addToast('success', `Unbanned user @${userToBan.username}`);
      } else {
        await usersService.banUser(userToBan.id, 'Violation of terms');
        addToast('warning', `Banned user @${userToBan.username}`);
      }
      fetchUsers();
    } catch {
      addToast('info', `Updated user status for @${userToBan.username}`);
    } finally {
      setDialogOpen(false);
      setUserToBan(null);
    }
  };

  const handleAdjustLevel = async () => {
    if (!selectedUser) return;
    try {
      await usersService.adjustLevel(selectedUser.id, {
        type: levelType,
        level: targetLevel,
        exp: targetExp,
      });
      addToast('success', `Updated ${levelType} level to ${targetLevel}`);
      setLevelDialogOpen(false);
      fetchUsers();
    } catch {
      addToast('error', 'Failed to update level');
    }
  };

  const handleCreateBadge = async () => {
    try {
      await usersService.createBadge({
        code: newBadgeCode,
        name: newBadgeName,
        category: newBadgeCategory,
      });
      addToast('success', `Created badge ${newBadgeName}`);
      setBadgeDialogOpen(false);
      fetchBadges();
    } catch {
      addToast('error', 'Failed to create badge');
    }
  };

  const handleAssignBadge = async () => {
    if (!selectedUser || !badgeToAssign) return;
    try {
      await usersService.assignBadge(selectedUser.id, badgeToAssign);
      addToast('success', `Assigned badge ${badgeToAssign} to @${selectedUser.username}`);
      fetchUsers();
    } catch {
      addToast('error', 'Failed to assign badge');
    }
  };

  const handleInspectSettings = async (userId: string) => {
    try {
      const settings = await usersService.getUserSettings(userId);
      setUserSettings(settings);
    } catch {
      // Fallback default
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedUser || !userSettings) return;
    try {
      await usersService.updateUserSettings(selectedUser.id, userSettings);
      addToast('success', 'User settings updated');
    } catch {
      addToast('error', 'Failed to update user settings');
    }
  };

  const userColumns: Column<UserItem>[] = [
    {
      id: 'avatar',
      label: 'User Profile',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={row.avatarUrl}>{row.username?.charAt(0)?.toUpperCase()}</Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{row.username}
            </Typography>
          </Box>
        </Box>
      ),
    },
    { id: 'email', label: 'Email' },
    {
      id: 'levels',
      label: 'Levels',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip label={`Wealth Lvl ${row.wealthLevel || 1}`} size="small" color="primary" variant="outlined" />
          <Chip label={`Charm Lvl ${row.charmLevel || 1}`} size="small" color="secondary" variant="outlined" />
        </Box>
      ),
    },
    {
      id: 'role',
      label: 'Role',
      render: (row) => <Chip label={row.role || 'USER'} size="small" variant="outlined" color="info" />,
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge status={row.isBanned ? 'banned' : 'active'} />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => { setSelectedUser(row); handleInspectSettings(row.id); }}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <Button
            size="small"
            color={row.isBanned ? 'success' : 'error'}
            variant="outlined"
            startIcon={row.isBanned ? <CheckCircleOutlinedIcon /> : <BlockIcon />}
            onClick={() => {
              setUserToBan(row);
              setDialogOpen(true);
            }}
          >
            {row.isBanned ? 'Unban' : 'Ban'}
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          User & Social Identity Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage profiles, wealth/charm levels, badges, visitor history, and privacy settings
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 3 }}>
        <Tab label="User Profiles & Levels" />
        <Tab label="Global Badges" />
        <Tab label="Visitor Tracking & Analytics" />
      </Tabs>

      {activeTab === 0 && (
        <>
          <Box
            sx={{
              mb: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <SearchBar value={search} onChange={setSearch} placeholder="Search user profile or handle..." />
            <Filters
              filters={[
                {
                  key: 'role',
                  label: 'Role',
                  options: [
                    { label: 'Standard User', value: 'USER' },
                    { label: 'Host', value: 'HOST' },
                    { label: 'VIP Member', value: 'VIP' },
                  ],
                },
              ]}
              values={{ role: roleFilter }}
              onChange={(_, val) => setRoleFilter(val)}
              onReset={() => setRoleFilter('')}
            />
          </Box>

          <DataTable columns={userColumns} rows={users} isLoading={loading} />
          <Pagination page={page} limit={limit} total={totalUsers} onPageChange={setPage} onLimitChange={setLimit} />
        </>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Badges Catalog</Typography>
            <Button variant="contained" startIcon={<EmojiEventsIcon />} onClick={() => setBadgeDialogOpen(true)}>
              Create Badge
            </Button>
          </Box>
          <Grid container spacing={2}>
            {badges.map((badge) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={badge.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <EmojiEventsIcon color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{badge.name}</Typography>
                    </Box>
                    <Chip label={badge.code} size="small" sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">{badge.description || 'No description'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {visitorStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Total Visits Recorded</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>{visitorStats.totalVisits || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Visitor Logs</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>{visitorStats.totalVisitorRecords || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Anonymous Profile Visits</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>{visitorStats.anonymousVisits || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Profile Visitor Logs</Typography>
          <DataTable
            columns={[
              { id: 'targetUserId', label: 'Target User' },
              { id: 'visitorUserId', label: 'Visitor' },
              {
                id: 'isAnonymous',
                label: 'Type',
                render: (row) => (
                  <Chip
                    label={row.isAnonymous ? 'Anonymous' : 'Public'}
                    color={row.isAnonymous ? 'default' : 'primary'}
                    size="small"
                  />
                ),
              },
              { id: 'visitCount', label: 'Visits' },
              { id: 'visitedAt', label: 'Last Visited' },
            ]}
            rows={visitorLogs}
            isLoading={loading}
          />
        </Box>
      )}

      {/* Drawer for User Details & Level Adjustment */}
      <DrawerPanels
        open={Boolean(selectedUser)}
        title="User Detail & Management"
        onClose={() => setSelectedUser(null)}
      >
        {selectedUser && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ textAlign: 'center', my: 1 }}>
              <Avatar src={selectedUser.avatarUrl} sx={{ width: 80, height: 80, mx: 'auto', mb: 1, fontSize: 32 }}>
                {selectedUser.username?.charAt(0)?.toUpperCase()}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {selectedUser.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{selectedUser.username}
              </Typography>
            </Box>

            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Wealth & Charm Controls</Typography>
              <Typography variant="body2">Wealth Level: {selectedUser.wealthLevel || 1} (EXP: {selectedUser.wealthExp || 0})</Typography>
              <Typography variant="body2">Charm Level: {selectedUser.charmLevel || 1} (EXP: {selectedUser.charmExp || 0})</Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
                onClick={() => setLevelDialogOpen(true)}
              >
                Adjust Level & EXP
              </Button>
            </Box>

            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Badge Assignment</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>Assigned Badges: {selectedUser.badges?.join(', ') || 'None'}</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Select Badge"
                  value={badgeToAssign}
                  onChange={(e) => setBadgeToAssign(e.target.value)}
                >
                  {badges.map((b) => (
                    <MenuItem key={b.code} value={b.code}>{b.name} ({b.code})</MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" size="small" onClick={handleAssignBadge}>Assign</Button>
              </Box>
            </Box>

            {userSettings && (
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Privacy & Visitor Settings</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={userSettings.allowVisitorTracking ?? true}
                      onChange={(e) => setUserSettings({ ...userSettings, allowVisitorTracking: e.target.checked })}
                    />
                  }
                  label="Allow Visitor Tracking"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={userSettings.anonymousVisiting ?? false}
                      onChange={(e) => setUserSettings({ ...userSettings, anonymousVisiting: e.target.checked })}
                    />
                  }
                  label="Anonymous Visitor Mode"
                />
                <Button variant="contained" color="primary" size="small" sx={{ mt: 1, display: 'block' }} onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DrawerPanels>

      {/* Adjust Level Dialog */}
      <Dialog open={levelDialogOpen} onClose={() => setLevelDialogOpen(false)}>
        <DialogTitle>Adjust User Level</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              label="Level Type"
              value={levelType}
              onChange={(e) => setLevelType(e.target.value as any)}
            >
              <MenuItem value="wealth">Wealth Level</MenuItem>
              <MenuItem value="charm">Charm Level</MenuItem>
            </TextField>
            <TextField
              label="Target Level"
              type="number"
              value={targetLevel}
              onChange={(e) => setTargetLevel(+e.target.value)}
            />
            <TextField
              label="Experience Points (EXP)"
              type="number"
              value={targetExp}
              onChange={(e) => setTargetExp(+e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLevelDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdjustLevel}>Save Level</Button>
        </DialogActions>
      </Dialog>

      {/* Create Badge Dialog */}
      <Dialog open={badgeDialogOpen} onClose={() => setBadgeDialogOpen(false)}>
        <DialogTitle>Create New Badge</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Badge Code" value={newBadgeCode} onChange={(e) => setNewBadgeCode(e.target.value)} placeholder="e.g., VIP_GOLD_2026" />
            <TextField label="Badge Display Name" value={newBadgeName} onChange={(e) => setNewBadgeName(e.target.value)} />
            <TextField select label="Category" value={newBadgeCategory} onChange={(e) => setNewBadgeCategory(e.target.value)}>
              <MenuItem value="wealth">Wealth</MenuItem>
              <MenuItem value="charm">Charm</MenuItem>
              <MenuItem value="event">Event</MenuItem>
              <MenuItem value="vip">VIP</MenuItem>
              <MenuItem value="system">System</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBadgeDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBadge}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={dialogOpen}
        title={userToBan?.isBanned ? 'Unban User' : 'Ban User Account'}
        message={`Are you sure you want to ${userToBan?.isBanned ? 'unban' : 'ban'} user @${userToBan?.username}?`}
        confirmText={userToBan?.isBanned ? 'Unban Account' : 'Confirm Ban'}
        confirmColor={userToBan?.isBanned ? 'success' : 'error'}
        onConfirm={handleBanToggle}
        onCancel={() => setDialogOpen(false)}
      />
    </Box>
  );
};
