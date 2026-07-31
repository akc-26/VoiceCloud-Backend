import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { DollarSign, TrendingUp, Gift, Crown, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const EarningsPage: React.FC = () => {
  const payoutQuery = useQuery({
    queryKey: ['creator', 'payouts'],
    queryFn: ({ signal }) => creatorApi.getPayoutRequests(signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const walletQuery = useQuery({
    queryKey: ['creator', 'wallet'],
    queryFn: ({ signal }) => creatorApi.getWalletSummary(signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  if (payoutQuery.isLoading || walletQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="table" count={4} />
      </Box>
    );
  }

  if (payoutQuery.isError) {
    return (
      <PageErrorState
        title="Failed to Load Earnings Data"
        message={payoutQuery.error?.message || 'Unable to retrieve payout records from backend.'}
        onRetry={() => payoutQuery.refetch()}
      />
    );
  }

  const payouts = payoutQuery.data || [];

  const earningsBreakdown = [
    { month: 'July 2026', gifts: '$840.00', subs: '$300.00', bonus: '$110.00', total: '$1,250.00' },
    { month: 'June 2026', gifts: '$620.00', subs: '$280.00', bonus: '$90.00', total: '$990.00' },
    { month: 'May 2026', gifts: '$510.00', subs: '$210.00', bonus: '$60.00', total: '$780.00' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Revenue & Earnings Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track virtual gifts income, subscriber monthly recurring revenue (MRR), and platform bonuses.
        </Typography>
      </Box>

      {/* Revenue Summary Cards */}
      <Grid container spacing={2.5}>
        <Grid xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Gift Revenues
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', my: 0.5 }}>
                $840.00
              </Typography>
              <Typography variant="caption" color="text.secondary">
                67% of total revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Subscriptions MRR
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main', my: 0.5 }}>
                $300.00
              </Typography>
              <Typography variant="caption" color="text.secondary">
                24% of total revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Platform Host Bonus
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.main', my: 0.5 }}>
                $110.00
              </Typography>
              <Typography variant="caption" color="text.secondary">
                9% of total revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Revenue Logs */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Monthly Revenue Logs
          </Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell>Virtual Gifts</TableCell>
                  <TableCell>Subscriptions</TableCell>
                  <TableCell>Host Bonuses</TableCell>
                  <TableCell>Net Total Earnings</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {earningsBreakdown.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 700 }}>{row.month}</TableCell>
                    <TableCell>{row.gifts}</TableCell>
                    <TableCell>{row.subs}</TableCell>
                    <TableCell>{row.bonus}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: 'success.main' }}>{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Payout Requests History */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Payout Requests History
          </Typography>
          {payouts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No withdrawal requests recorded yet.
            </Typography>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Request ID</TableCell>
                    <TableCell>Diamonds</TableCell>
                    <TableCell>Amount ($ USD)</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell sx={{ fontWeight: 700 }}>{p.id}</TableCell>
                      <TableCell>💎 {p.diamondAmount?.toLocaleString()}</TableCell>
                      <TableCell>${p.payoutAmount ?? (p.diamondAmount / 100).toFixed(2)} USD</TableCell>
                      <TableCell>{p.payoutMethod}</TableCell>
                      <TableCell>
                        <Chip
                          label={p.status}
                          color={p.status === 'PROCESSED' || p.status === 'APPROVED' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
