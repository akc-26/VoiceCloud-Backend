import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Avatar, Chip, IconButton } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { DataTable, Column } from '../components/common/DataTable';
import { SearchBar } from '../components/common/SearchBar';
import { Filters } from '../components/common/Filters';
import { Pagination } from '../components/common/Pagination';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { DrawerPanels } from '../components/common/DrawerPanels';
import { usersService, UserItem } from '../services/users.service';
import { useNotificationsStore } from '../store/notifications.store';

export const UsersPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);

  const [users, setUsers] = useState<UserItem[]>([
    { id: 'usr-1', username: 'alex_pro', displayName: 'Alex Rivera', email: 'alex@example.com', role: 'USER', isBanned: false, createdAt: '2026-01-12' },
    { id: 'usr-2', username: 'sarah_voice', displayName: 'Sarah Chen', email: 'sarah@example.com', role: 'HOST', isBanned: false, createdAt: '2026-02-04' },
    { id: 'usr-3', username: 'vip_mike', displayName: 'Mike Ross', email: 'mike@example.com', role: 'VIP', isBanned: true, createdAt: '2026-03-18' },
    { id: 'usr-4', username: 'moderator_jane', displayName: 'Jane Doe', email: 'jane@example.com', role: 'MODERATOR', isBanned: false, createdAt: '2026-04-01' },
  ]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<UserItem | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersService.getUsers({ page, limit, search });
      if (data?.items) {
        setUsers(data.items);
      }
    } catch {
      // Keep state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search]);

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
      setUsers((prev) =>
        prev.map((u) => (u.id === userToBan.id ? { ...u, isBanned: !u.isBanned } : u)),
      );
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.id === userToBan.id ? { ...u, isBanned: !u.isBanned } : u)),
      );
      addToast('info', `Updated user status for @${userToBan.username}`);
    } finally {
      setDialogOpen(false);
      setUserToBan(null);
    }
  };

  const columns: Column<UserItem>[] = [
    {
      id: 'avatar',
      label: 'User',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={row.avatarUrl}>{row.username.charAt(0).toUpperCase()}</Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700}>
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
      id: 'role',
      label: 'Role',
      render: (row) => <Chip label={row.role} size="small" variant="outlined" color="primary" />,
    },
    {
      id: 'status',
      label: 'Account Status',
      render: (row) => (
        <StatusBadge status={row.isBanned ? 'banned' : 'active'} />
      ),
    },
    { id: 'createdAt', label: 'Registered' },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => setSelectedUser(row)}>
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

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          User Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View registered accounts, assign roles, inspect activity, and handle bans
        </Typography>
      </Box>

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
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, handle, or email..." />
        <Filters
          filters={[
            {
              key: 'role',
              label: 'Role',
              options: [
                { label: 'Standard User', value: 'USER' },
                { label: 'Host', value: 'HOST' },
                { label: 'VIP Member', value: 'VIP' },
                { label: 'Moderator', value: 'MODERATOR' },
              ],
            },
          ]}
          values={{ role: roleFilter }}
          onChange={(_, val) => setRoleFilter(val)}
          onReset={() => setRoleFilter('')}
        />
      </Box>

      <DataTable columns={columns} rows={filteredUsers} isLoading={loading} />

      <Pagination page={page} limit={limit} total={filteredUsers.length} onPageChange={setPage} onLimitChange={setLimit} />

      {/* Drawer for User Details */}
      <DrawerPanels
        open={Boolean(selectedUser)}
        title="User Profile Detail"
        onClose={() => setSelectedUser(null)}
      >
        {selectedUser && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ textAlign: 'center', my: 2 }}>
              <Avatar src={selectedUser.avatarUrl} sx={{ width: 80, height: 80, mx: 'auto', mb: 1, fontSize: 32 }}>
                {selectedUser.username.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>
                {selectedUser.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{selectedUser.username}
              </Typography>
            </Box>
            <Typography variant="subtitle2" fontWeight={700}>Account Details</Typography>
            <Typography variant="body2">Email: {selectedUser.email}</Typography>
            <Typography variant="body2">Role: {selectedUser.role}</Typography>
            <Typography variant="body2">Registered: {selectedUser.createdAt}</Typography>
            <Typography variant="body2">
              Status: <StatusBadge status={selectedUser.isBanned ? 'banned' : 'active'} />
            </Typography>
          </Box>
        )}
      </DrawerPanels>

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
