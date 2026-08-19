import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

const MINIMUM_PAYOUT_DIAMONDS = 100;
const PAYOUT_USD_PER_DIAMOND = 0.005;

export const PayoutRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [amount, setAmount] = useState(String(MINIMUM_PAYOUT_DIAMONDS));
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [details, setDetails] = useState('');

  const payoutQuery = useQuery({
    queryKey: ['creator', 'payouts'],
    queryFn: ({ signal }) => creatorApi.getPayoutRequests(signal),
    retry: 1,
  });
  const walletQuery = useQuery({
    queryKey: ['creator', 'wallet'],
    queryFn: ({ signal }) => creatorApi.getWalletSummary(signal),
    retry: 1,
  });
  const submitMutation = useMutation({
    mutationFn: () =>
      creatorApi.submitPayoutRequest(Number(amount), method, details.trim()),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['creator', 'payouts'] }),
        queryClient.invalidateQueries({ queryKey: ['creator', 'wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['creator', 'earnings'] }),
      ]);
      setOpenModal(false);
      setAmount(String(MINIMUM_PAYOUT_DIAMONDS));
      setDetails('');
    },
  });

  if (payoutQuery.isLoading || walletQuery.isLoading)
    return <LoadingSkeleton type="table" count={4} />;
  if (payoutQuery.isError || walletQuery.isError) {
    const error = payoutQuery.error || walletQuery.error;
    return (
      <PageErrorState
        title="Failed to Load Payouts"
        message={error?.message || 'Unable to retrieve payout requests.'}
        onRetry={() => {
          payoutQuery.refetch();
          walletQuery.refetch();
        }}
      />
    );
  }

  const payouts = payoutQuery.data || [];
  const withdrawable = Number(
    walletQuery.data!.wallet.withdrawableBalance || 0,
  );
  const requested = Number(amount || 0);
  const invalid =
    !Number.isInteger(requested) ||
    requested < MINIMUM_PAYOUT_DIAMONDS ||
    requested > withdrawable ||
    details.trim().length === 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Payout Requests & Withdrawals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Available: 💎 {withdrawable.toLocaleString()}. Minimum request:{' '}
            {MINIMUM_PAYOUT_DIAMONDS} diamonds ($
            {(MINIMUM_PAYOUT_DIAMONDS * PAYOUT_USD_PER_DIAMOND).toFixed(2)}{' '}
            USD).
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<Plus size={18} />}
          onClick={() => setOpenModal(true)}
        >
          Submit Payout Request
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Request ID</TableCell>
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
                  payouts.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>
                        💎 {Number(row.diamondAmount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        ${Number(row.payoutAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>{row.payoutMethod}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.status}
                          color={
                            row.status === 'PROCESSED'
                              ? 'success'
                              : row.status === 'REJECTED'
                                ? 'error'
                                : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Submit Payout Request</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {submitMutation.isError && (
              <Alert severity="error">{submitMutation.error.message}</Alert>
            )}
            <TextField
              label="Diamonds"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              helperText={`Estimated: $${(requested * PAYOUT_USD_PER_DIAMOND).toFixed(2)} USD`}
              slotProps={{
                htmlInput: { min: MINIMUM_PAYOUT_DIAMONDS, step: 1 },
              }}
            />
            <TextField
              select
              label="Payout Method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              <MenuItem value="PAYPAL">PayPal</MenuItem>
              <MenuItem value="STRIPE">Stripe</MenuItem>
              <MenuItem value="CRYPTO">Crypto</MenuItem>
            </TextField>
            <TextField
              label="Account / payout details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={invalid || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
