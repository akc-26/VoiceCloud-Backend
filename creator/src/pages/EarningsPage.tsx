import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const EarningsPage: React.FC = () => {
  const earningsQuery = useQuery({
    queryKey: ['creator', 'earnings'],
    queryFn: ({ signal }) => creatorApi.getCreatorEarnings(signal),
    staleTime: 30 * 1000,
    retry: 1,
  });
  const payoutQuery = useQuery({
    queryKey: ['creator', 'payouts'],
    queryFn: ({ signal }) => creatorApi.getPayoutRequests(signal),
    staleTime: 30 * 1000,
    retry: 1,
  });

  if (earningsQuery.isLoading || payoutQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="table" count={4} />
      </Box>
    );
  }
  if (earningsQuery.isError || payoutQuery.isError) {
    const error = earningsQuery.error || payoutQuery.error;
    return (
      <PageErrorState
        title="Failed to Load Earnings"
        message={
          error?.message || 'Unable to retrieve authoritative earnings data.'
        }
        onRetry={() => {
          earningsQuery.refetch();
          payoutQuery.refetch();
        }}
      />
    );
  }

  const earnings = earningsQuery.data!;
  const payouts = payoutQuery.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Revenue & Earnings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live Creator subscription and payout metrics from the authoritative
          backend.
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Active Subscribers
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {earnings.totalSubscribers.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Estimated Recurring Revenue
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: 'success.main' }}
              >
                ${earnings.estimatedRecurringRevenue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Pending Payouts
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: 'warning.main' }}
              >
                ${earnings.pendingPayoutsAmount.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Lifetime Earnings
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: 'primary.main' }}
              >
                ${earnings.lifetimeEarnings.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Payout Lifecycle
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Request</TableCell>
                  <TableCell>Diamonds</TableCell>
                  <TableCell>USD</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      No payout requests recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>{payout.id}</TableCell>
                      <TableCell>
                        💎 {Number(payout.diamondAmount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        ${Number(payout.payoutAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>{payout.payoutMethod}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={payout.status}
                          color={
                            payout.status === 'PROCESSED'
                              ? 'success'
                              : payout.status === 'REJECTED'
                                ? 'error'
                                : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(payout.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
