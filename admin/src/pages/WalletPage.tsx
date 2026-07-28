import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PaidIcon from '@mui/icons-material/Paid';

import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';

interface Transaction {
  id: string;
  user: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
}

export const WalletPage: React.FC = () => {
  const [transactions] = useState<Transaction[]>([
    { id: 'tx-101', user: 'alex_pro', type: 'Recharge Diamonds', amount: 50.0, currency: 'USD', status: 'completed', date: '2026-07-24 14:20' },
    { id: 'tx-102', user: 'sarah_voice', type: 'Host Payout Withdrawal', amount: -250.0, currency: 'USD', status: 'pending', date: '2026-07-24 12:05' },
    { id: 'tx-103', user: 'vip_mike', type: 'VIP Subscription Fee', amount: 19.99, currency: 'USD', status: 'completed', date: '2026-07-23 18:45' },
  ]);

  const columns: Column<Transaction>[] = [
    { id: 'id', label: 'Tx ID' },
    { id: 'user', label: 'User Handle' },
    { id: 'type', label: 'Transaction Type' },
    {
      id: 'amount',
      label: 'Amount',
      render: (row) => (
        <Typography variant="body2" fontWeight={700} color={row.amount > 0 ? 'success.main' : 'error.main'}>
          {row.amount > 0 ? `+$${row.amount.toFixed(2)}` : `-$${Math.abs(row.amount).toFixed(2)}`}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    { id: 'date', label: 'Timestamp' },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          Wallet & Economy Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor user coin balances, coin recharges, host payouts, and platform gift commissions
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={0}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Platform Reserves</Typography>
              <Typography variant="h4" fontWeight={800} color="primary.main">$248,500.00</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={0}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Pending Payout Requests</Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main">$12,450.00</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={0}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Gift Coin Circulation</Typography>
              <Typography variant="h4" fontWeight={800} color="success.main">1,480,000 Coins</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Recent Treasury & User Transactions
      </Typography>
      <DataTable columns={columns} rows={transactions} />
    </Box>
  );
};
