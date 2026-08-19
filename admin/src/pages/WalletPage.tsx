import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentsIcon from '@mui/icons-material/Payments';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { SearchBar } from '../components/common/SearchBar';
import {
  AdminCreatorPayout,
  AdminWalletTransaction,
  economyAdminService,
} from '../services/economy.service';
import { useNotificationsStore } from '../store/notifications.store';

const payoutMethods = [
  { value: '', label: 'All Methods' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'CRYPTO', label: 'Crypto' },
];

export const WalletPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [transactions, setTransactions] = useState<AdminWalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<AdminCreatorPayout[]>([]);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, ledgerData, payoutData] = await Promise.all([
        economyAdminService.getOverview(),
        economyAdminService.getTransactions({ page: 1, limit: 100, search: search || undefined, method: method || undefined }),
        economyAdminService.getCreatorPayouts({ search: search || undefined, method: method || undefined }),
      ]);
      setOverview(overviewData);
      setTransactions(ledgerData.data || []);
      setPayouts(payoutData || []);
    } catch (error: any) {
      addToast('error', error?.response?.data?.message || error.message || 'Failed to load economy data');
    } finally {
      setLoading(false);
    }
  }, [addToast, search, method]);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchData(), 250);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  const pendingPayoutAmount = useMemo(
    () => payouts.filter((p) => p.status === 'PENDING' || p.status === 'APPROVED')
      .reduce((sum, p) => sum + Number(p.payoutAmount || 0), 0),
    [payouts],
  );

  const transactionColumns: Column<AdminWalletTransaction>[] = [
    { id: 'userName', label: 'User Name', render: (row) => <Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{row.userName || row.username || 'Unknown User'}</Typography>{row.username && <Typography variant="caption" color="text.secondary">@{row.username}</Typography>}</Box> },
    { id: 'amount', label: 'Amount', render: (row) => `${Number(row.amount).toLocaleString()} ${row.currency}` },
    { id: 'method', label: 'Method', render: (row) => row.method || row.source || row.referenceType || row.transactionType },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status.toLowerCase()} /> },
    { id: 'actions', label: 'Actions', align: 'right', render: (row) => <IconButton size="small" onClick={() => navigate(`/wallet/transactions/${row.id}`)} title="View complete transaction details"><VisibilityIcon /></IconButton> },
  ];

  const actOnPayout = async (payout: AdminCreatorPayout, action: 'approve' | 'reject' | 'process') => {
    try {
      if (action === 'approve') await economyAdminService.approveCreatorPayout(payout.id);
      if (action === 'reject') {
        const reason = window.prompt('Reason for rejection (optional):') || undefined;
        await economyAdminService.rejectCreatorPayout(payout.id, reason);
      }
      if (action === 'process') await economyAdminService.processCreatorPayout(payout.id);
      addToast('success', `Payout ${action} completed`);
      await fetchData();
    } catch (error: any) {
      addToast('error', error?.response?.data?.message || error.message || `Failed to ${action} payout`);
    }
  };

  const payoutColumns: Column<AdminCreatorPayout>[] = [
    { id: 'creatorName', label: 'User Name', render: (row) => <Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{row.creatorName || row.creatorUsername || 'Unknown Creator'}</Typography>{row.creatorUsername && <Typography variant="caption" color="text.secondary">@{row.creatorUsername}</Typography>}</Box> },
    { id: 'diamondAmount', label: 'Diamonds', render: (row) => `💎 ${Number(row.diamondAmount).toLocaleString()}` },
    { id: 'payoutAmount', label: 'Amount', render: (row) => `$${Number(row.payoutAmount).toFixed(2)} USD` },
    { id: 'payoutMethod', label: 'Method', render: (row) => row.payoutMethod.replaceAll('_', ' ') },
    { id: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status.toLowerCase()} /> },
    {
      id: 'actions', label: 'Actions', align: 'right', render: (row) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <IconButton size="small" onClick={() => navigate(`/wallet/payouts/${row.id}`)} title="View complete payout details"><VisibilityIcon /></IconButton>
          {row.status === 'PENDING' && <><Button size="small" color="success" startIcon={<CheckCircleIcon />} onClick={() => actOnPayout(row, 'approve')}>Approve</Button><Button size="small" color="error" startIcon={<CancelIcon />} onClick={() => actOnPayout(row, 'reject')}>Reject</Button></>}
          {row.status === 'APPROVED' && <Button size="small" color="primary" startIcon={<PaymentsIcon />} onClick={() => actOnPayout(row, 'process')}>Settle</Button>}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box><Typography variant="h4" sx={{ fontWeight: 800 }}>Wallet & Economy Management</Typography><Typography variant="body2" color="text.secondary">Live treasury metrics, immutable wallet ledger and Creator payout review.</Typography></Box>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => void fetchData()} disabled={loading}>Refresh</Button>
      </Box>

      {loading && !overview ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box> : <>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Completed Purchase Revenue</Typography><Typography variant="h4" sx={{ fontWeight: 800 }} color="primary.main">${Number(overview?.totalRevenueUsd || 0).toFixed(2)}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Coins in Circulation</Typography><Typography variant="h4" sx={{ fontWeight: 800 }} color="success.main">{Number(overview?.totalCoinsInCirculation || 0).toLocaleString()}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Diamonds Issued</Typography><Typography variant="h4" sx={{ fontWeight: 800 }} color="secondary.main">{Number(overview?.totalDiamondsIssued || 0).toLocaleString()}</Typography></CardContent></Card></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">Reserved / Pending Payouts</Typography><Typography variant="h4" sx={{ fontWeight: 800 }} color="warning.main">${pendingPayoutAmount.toFixed(2)}</Typography></CardContent></Card></Grid>
        </Grid>

        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}><Tab label="Transaction Ledger" /><Tab label={`Creator Payouts (${payouts.length})`} /></Tabs>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ flex: 1, minWidth: 280 }}><SearchBar value={search} onChange={setSearch} placeholder="Search by user name, username or email..." /></Box>
          <TextField select size="small" label="Method" value={method} onChange={(e) => setMethod(e.target.value)} sx={{ minWidth: 190 }}>{payoutMethods.map((option) => <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>)}</TextField>
        </Box>
        {tab === 0 && <DataTable columns={transactionColumns} rows={transactions} isLoading={loading} />}
        {tab === 1 && <DataTable columns={payoutColumns} rows={payouts} isLoading={loading} />}
      </>}
    </Box>
  );
};
