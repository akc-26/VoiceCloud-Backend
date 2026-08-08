import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { Crown, Plus, Check, Users, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const SubscribersPage: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const plansQuery = useQuery({
    queryKey: ['creator', 'plans'],
    queryFn: ({ signal }) => creatorApi.getCreatorPlans(signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const subscribersQuery = useQuery({
    queryKey: ['creator', 'subscribers'],
    queryFn: ({ signal }) => creatorApi.getSubscribers(signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const isLoading = plansQuery.isLoading || subscribersQuery.isLoading;
  const isError = plansQuery.isError || subscribersQuery.isError;

  if (isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="card" count={2} />
      </Box>
    );
  }

  if (isError) {
    return (
      <PageErrorState
        title="Unable to Load Subscription Tiers"
        message={
          plansQuery.error?.message ||
          subscribersQuery.error?.message ||
          'Failed to fetch subscription data.'
        }
        onRetry={() => {
          plansQuery.refetch();
          subscribersQuery.refetch();
        }}
      />
    );
  }

  const plans = plansQuery.data || [];
  const subscribers = subscribersQuery.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Subscription Plans & VIP Perks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define membership tiers, monthly coin prices, exclusive supporter
            badges, and member lists.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={18} />}
          onClick={() => setIsCreateOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Create New Tier
        </Button>
      </Box>

      {/* Plans List */}
      {plans.length === 0 ? (
        <EmptyState
          icon={<Crown size={48} />}
          title="No Subscription Tiers"
          description="Create custom membership plans to allow followers to subscribe monthly for exclusive VIP perks."
          actionLabel="Create Tier"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <Grid container spacing={3}>
          {plans.map((p) => (
            <Grid key={p.id} size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {p.name || p.title}
                    </Typography>
                    <Chip
                      icon={<Crown size={14} />}
                      label={`${p.activeSubscribersCount ?? 0} Subscribers`}
                      color="primary"
                      size="small"
                    />
                  </Box>

                  <Typography
                    variant="h4"
                    color="primary.main"
                    sx={{ fontWeight: 800, my: 1.5 }}
                  >
                    {p.priceCoins ? `${p.priceCoins} Coins/mo` : '$4.99/mo'}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 700, mb: 1 }}
                  >
                    Included Subscriber Perks:
                  </Typography>
                  <Stack spacing={1} sx={{ mb: 2.5 }}>
                    {(
                      p.perks || [
                        'VIP Badge',
                        'Priority Mic Seat',
                        'Custom Chat Bubble',
                      ]
                    ).map((perk: string, i: number) => (
                      <Typography
                        key={i}
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Check size={16} color="#10b981" /> {perk}
                      </Typography>
                    ))}
                  </Stack>

                  <Button variant="outlined" fullWidth sx={{ fontWeight: 700 }}>
                    Configure Plan
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Subscriber Members Directory */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Active VIP Subscribers Directory
          </Typography>

          {subscribers.length === 0 ? (
            <EmptyState
              icon={<Users size={36} />}
              title="No Active Subscribers"
              description="Subscriber memberships will appear here once users join your subscription tiers."
            />
          ) : (
            <Paper
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Subscriber</TableCell>
                    <TableCell>Tier Plan</TableCell>
                    <TableCell>Subscribed Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subscribers.map((sub: any) => (
                    <TableRow key={sub.id}>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {sub.subscriber?.displayName ||
                          sub.subscriber?.username ||
                          'Supporter'}
                      </TableCell>
                      <TableCell>
                        {sub.plan?.name || 'Silver Supporter'}
                      </TableCell>
                      <TableCell>
                        {new Date(
                          sub.startedAt || Date.now(),
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sub.status || 'ACTIVE'}
                          color="success"
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Create Tier Dialog */}
      <Dialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Create New Subscription Tier
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Tier Name"
              placeholder="e.g. Platinum All-Access"
              fullWidth
            />
            <TextField
              label="Monthly Coin Price"
              placeholder="1000"
              type="number"
              fullWidth
            />
            <TextField
              label="Included Perks (comma separated)"
              placeholder="VIP Badge, Priority Mic, Custom Chat"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => setIsCreateOpen(false)}
            sx={{ fontWeight: 700 }}
          >
            Create Tier
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
