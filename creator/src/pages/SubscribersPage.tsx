import { BRAND_CONFIG } from '@shared/branding';
import React, { useMemo, useState } from 'react';
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
  Alert,
  CircularProgress,
} from '@mui/material';
import { Crown, Plus, Check, Users, Pencil, Archive } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { CreatorPlan } from '../types/creator.types';
import { PageErrorState } from '../components/common/PageErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

interface PlanFormState {
  title: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  benefits: string;
}

const emptyForm: PlanFormState = {
  title: '',
  description: '',
  monthlyPrice: '',
  yearlyPrice: '',
  benefits: '',
};

export const SubscribersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CreatorPlan | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const monthlyPrice = Number(form.monthlyPrice);
      const yearlyPrice = form.yearlyPrice.trim()
        ? Number(form.yearlyPrice)
        : undefined;
      if (!form.title.trim()) throw new Error('Tier name is required.');
      if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
        throw new Error('Monthly price must be a valid non-negative USD amount.');
      }
      if (
        yearlyPrice !== undefined &&
        (!Number.isFinite(yearlyPrice) || yearlyPrice < 0)
      ) {
        throw new Error('Yearly price must be a valid non-negative USD amount.');
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        monthlyPrice,
        yearlyPrice,
        benefits: form.benefits
          .split(',')
          .map((benefit) => benefit.trim())
          .filter(Boolean),
        visibility: 'PUBLIC' as const,
      };

      if (editingPlan) {
        return creatorApi.updateCreatorPlan(editingPlan.id, payload);
      }
      return creatorApi.createCreatorPlan(payload);
    },
    onSuccess: async () => {
      setActionError(null);
      setIsFormOpen(false);
      setEditingPlan(null);
      setForm(emptyForm);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['creator', 'plans'] }),
        queryClient.invalidateQueries({ queryKey: ['creator', 'dashboard'] }),
      ]);
    },
    onError: (error: Error) => {
      setActionError(error?.message || 'Subscription tier could not be saved.');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => creatorApi.archiveCreatorPlan(id),
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['creator', 'plans'] }),
        queryClient.invalidateQueries({ queryKey: ['creator', 'dashboard'] }),
      ]);
    },
    onError: (error: Error) => {
      setActionError(error?.message || 'Subscription tier could not be archived.');
    },
  });

  const isLoading = plansQuery.isLoading || subscribersQuery.isLoading;
  const isError = plansQuery.isError || subscribersQuery.isError;

  const subscribersByPlan = useMemo(() => {
    const map = new Map<string, number>();
    (subscribersQuery.data || []).forEach((sub: any) => {
      const planId = sub.planId || sub.plan?.id;
      if (planId && String(sub.status || '').toUpperCase() === 'ACTIVE') {
        map.set(planId, (map.get(planId) || 0) + 1);
      }
    });
    return map;
  }, [subscribersQuery.data]);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = (plan: CreatorPlan) => {
    setEditingPlan(plan);
    setForm({
      title: plan.title || '',
      description: plan.description || '',
      monthlyPrice: String(plan.monthlyPrice ?? ''),
      yearlyPrice:
        plan.yearlyPrice === null || plan.yearlyPrice === undefined
          ? ''
          : String(plan.yearlyPrice),
      benefits: (plan.benefits || []).join(', '),
    });
    setActionError(null);
    setIsFormOpen(true);
  };

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
          void plansQuery.refetch();
          void subscribersQuery.refetch();
        }}
      />
    );
  }

  const plans = plansQuery.data || [];
  const subscribers = subscribersQuery.data || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
            Define membership tiers using the backend subscription-plan pricing
            model in USD and manage real subscriber memberships.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Plus size={18} />}
          onClick={openCreate}
          sx={{ fontWeight: 700 }}
        >
          Create New Tier
        </Button>
      </Box>

      {actionError && <Alert severity="error">{actionError}</Alert>}

      {plans.length === 0 ? (
        <EmptyState
          icon={<Crown size={48} />}
          title="No Subscription Tiers"
          description="Create a membership plan to allow followers to subscribe for configured benefits."
          actionLabel="Create Tier"
          onAction={openCreate}
        />
      ) : (
        <Grid container spacing={3}>
          {plans.map((plan) => (
            <Grid key={plan.id} size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {plan.title}
                    </Typography>
                    <Chip
                      icon={<Crown size={14} />}
                      label={`${subscribersByPlan.get(plan.id) || 0} Active Subscribers`}
                      color={plan.status === 'ACTIVE' ? 'primary' : 'default'}
                      size="small"
                    />
                  </Box>

                  {plan.description && (
                    <Typography variant="body2" color="text.secondary">
                      {plan.description}
                    </Typography>
                  )}

                  <Typography
                    variant="h4"
                    color="primary.main"
                    sx={{ fontWeight: 800, my: 1.5 }}
                  >
                    ${Number(plan.monthlyPrice || 0).toFixed(2)}/mo
                  </Typography>
                  {plan.yearlyPrice !== null && plan.yearlyPrice !== undefined && (
                    <Typography variant="caption" color="text.secondary">
                      Yearly: ${Number(plan.yearlyPrice).toFixed(2)}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Included Subscriber Benefits:
                  </Typography>
                  {plan.benefits?.length ? (
                    <Stack spacing={1} sx={{ mb: 2.5 }}>
                      {plan.benefits.map((benefit, index) => (
                        <Typography
                          key={`${plan.id}-${index}`}
                          variant="body2"
                          color="text.secondary"
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Check size={16} color={BRAND_CONFIG.colors.creator.success} />
                          {benefit}
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                      No benefits have been configured for this plan.
                    </Typography>
                  )}

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Pencil size={16} />}
                      onClick={() => openEdit(plan)}
                      disabled={plan.status === 'ARCHIVED'}
                      sx={{ fontWeight: 700 }}
                    >
                      Configure Plan
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      fullWidth
                      startIcon={<Archive size={16} />}
                      onClick={() => archiveMutation.mutate(plan.id)}
                      disabled={archiveMutation.isPending || plan.status === 'ARCHIVED'}
                      sx={{ fontWeight: 700 }}
                    >
                      {plan.status === 'ARCHIVED' ? 'Archived' : 'Archive'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

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
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
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
                        {sub.subscriber?.displayName || sub.subscriber?.username || '—'}
                      </TableCell>
                      <TableCell>{sub.plan?.title || '—'}</TableCell>
                      <TableCell>
                        {sub.startedAt
                          ? new Date(sub.startedAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sub.status || 'UNKNOWN'}
                          color={
                            String(sub.status).toUpperCase() === 'ACTIVE'
                              ? 'success'
                              : 'default'
                          }
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

      <Dialog
        open={isFormOpen}
        onClose={() => {
          if (!saveMutation.isPending) setIsFormOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingPlan ? 'Configure Subscription Tier' : 'Create New Subscription Tier'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Tier Name"
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Monthly Price (USD)"
              value={form.monthlyPrice}
              onChange={(e) => setForm((current) => ({ ...current, monthlyPrice: e.target.value }))}
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              fullWidth
              required
            />
            <TextField
              label="Yearly Price (USD, optional)"
              value={form.yearlyPrice}
              onChange={(e) => setForm((current) => ({ ...current, yearlyPrice: e.target.value }))}
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              fullWidth
            />
            <TextField
              label="Included Benefits (comma separated)"
              value={form.benefits}
              onChange={(e) => setForm((current) => ({ ...current, benefits: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsFormOpen(false)} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            startIcon={saveMutation.isPending ? <CircularProgress size={16} /> : undefined}
            sx={{ fontWeight: 700 }}
          >
            {editingPlan ? 'Save Changes' : 'Create Tier'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
