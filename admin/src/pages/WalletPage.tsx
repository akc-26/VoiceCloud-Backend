import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentsIcon from '@mui/icons-material/Payments';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  AdminCreatorPayout,
  AdminWalletTransaction,
  economyAdminService,
} from '../services/economy.service';
import { useNotificationsStore } from '../store/notifications.store';

export const WalletPage: React.FC = () => {
  const addToast = useNotificationsStore((state) => state.addToast);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [transactions, setTransactions] = useState<AdminWalletTransaction[]>(
    [],
  );
  const [payouts, setPayouts] = useState<AdminCreatorPayout[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, ledgerData, payoutData] = await Promise.all([
        economyAdminService.getOverview(),
        economyAdminService.getTransactions({ page: 1, limit: 50 }),
        economyAdminService.getCreatorPayouts(),
      ]);
      setOverview(overviewData);
      setTransactions(ledgerData.data || []);
      setPayouts(payoutData || []);
    } catch (error: any) {
      addToast('error', error.message || 'Failed to load economy data');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingPayoutAmount = useMemo(
    () =>
      payouts
        .filter((p) => p.status === 'PENDING' || p.status === 'APPROVED')
        .reduce((sum, p) => sum + Number(p.payoutAmount || 0), 0),
    [payouts],
  );

  const transactionColumns: Column<AdminWalletTransaction>[] = [
    { id: 'id', label: 'Transaction ID' },
    { id: 'userId', label: 'User ID' },
    { id: 'transactionType', label: 'Type' },
    {
      id: 'amount',
      label: 'Amount',
      render: (row) => `${Number(row.amount).toLocaleString()} ${row.currency}`,
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status.toLowerCase()} />,
    },
    {
      id: 'createdAt',
      label: 'Created',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  const actOnPayout = async (
    payout: AdminCreatorPayout,
    action: 'approve' | 'reject' | 'process',
  ) => {
    try {
      if (action === 'approve')
        await economyAdminService.approveCreatorPayout(payout.id);
      if (action === 'reject') {
        const reason =
          window.prompt('Reason for rejection (optional):') || undefined;
        await economyAdminService.rejectCreatorPayout(payout.id, reason);
      }
      if (action === 'process')
        await economyAdminService.processCreatorPayout(payout.id);
      addToast('success', `Payout ${action} completed`);
      await fetchData();
    } catch (error: any) {
      addToast('error', error.message || `Failed to ${action} payout`);
    }
  };

  const payoutColumns: Column<AdminCreatorPayout>[] = [
    { id: 'id', label: 'Request ID' },
    { id: 'creatorId', label: 'Creator ID' },
    {
      id: 'diamondAmount',
      label: 'Diamonds',
      render: (row) => `💎 ${Number(row.diamondAmount).toLocaleString()}`,
    },
    {
      id: 'payoutAmount',
      label: 'USD',
      render: (row) => `$${Number(row.payoutAmount).toFixed(2)}`,
    },
    { id: 'payoutMethod', label: 'Method' },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status.toLowerCase()} />,
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Stack direction="row" spacing={1}>
          {row.status === 'PENDING' && (
            <>
              <Button
                size="small"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => actOnPayout(row, 'approve')}
              >
                Approve
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => actOnPayout(row, 'reject')}
              >
                Reject
              </Button>
            </>
          )}
          {row.status === 'APPROVED' && (
            <Button
              size="small"
              color="primary"
              startIcon={<PaymentsIcon />}
              onClick={() => actOnPayout(row, 'process')}
            >
              Settle
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Wallet & Economy Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live treasury metrics, immutable wallet ledger and Creator payout
            review.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={fetchData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {loading && !overview ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Completed Purchase Revenue
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800 }}
                    color="primary.main"
                  >
                    ${Number(overview?.totalRevenueUsd || 0).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Coins in Circulation
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800 }}
                    color="success.main"
                  >
                    {Number(
                      overview?.totalCoinsInCirculation || 0,
                    ).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Diamonds Issued
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800 }}
                    color="secondary.main"
                  >
                    {Number(
                      overview?.totalDiamondsIssued || 0,
                    ).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Reserved / Pending Payouts
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800 }}
                    color="warning.main"
                  >
                    ${pendingPayoutAmount.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{ mb: 2 }}
          >
            <Tab label="Transaction Ledger" />
            <Tab label={`Creator Payouts (${payouts.length})`} />
          </Tabs>
          {tab === 0 && (
            <DataTable columns={transactionColumns} rows={transactions} />
          )}
          {tab === 1 && <DataTable columns={payoutColumns} rows={payouts} />}
        </>
      )}
    </Box>
  );
};
