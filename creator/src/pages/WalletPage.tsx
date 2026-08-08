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
  Grid,
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
import { DollarSign } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { PageErrorState } from '../components/common/PageErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

const PAYOUT_USD_PER_DIAMOND = 0.005;
const MINIMUM_PAYOUT_DIAMONDS = 100;

export const WalletPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState(String(MINIMUM_PAYOUT_DIAMONDS));
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [accountDetails, setAccountDetails] = useState('');

  const walletQuery = useQuery({
    queryKey: ['creator', 'wallet'],
    queryFn: ({ signal }) => creatorApi.getWalletSummary(signal),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const transactionsQuery = useQuery({
    queryKey: ['creator', 'wallet', 'transactions'],
    queryFn: ({ signal }) =>
      creatorApi.getWalletTransactions({ page: 1, limit: 10 }, signal),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const withdrawMutation = useMutation({
    mutationFn: (vars: {
      diamondAmount: number;
      method: string;
      details: string;
    }) =>
      creatorApi.submitPayoutRequest(
        vars.diamondAmount,
        vars.method,
        vars.details,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['creator', 'wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['creator', 'payouts'] }),
      ]);
      setIsWithdrawOpen(false);
      setAmount(String(MINIMUM_PAYOUT_DIAMONDS));
      setAccountDetails('');
    },
  });

  if (walletQuery.isLoading || transactionsQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="card" count={3} />
      </Box>
    );
  }

  if (walletQuery.isError || transactionsQuery.isError) {
    const error = walletQuery.error || transactionsQuery.error;
    return (
      <PageErrorState
        title="Failed to Load Wallet"
        message={
          error?.message || 'Unable to retrieve the authoritative wallet data.'
        }
        onRetry={() => {
          walletQuery.refetch();
          transactionsQuery.refetch();
        }}
      />
    );
  }

  const wallet = walletQuery.data!.wallet;
  const transactions = transactionsQuery.data?.data || [];
  const requestedDiamonds = Number(amount || 0);
  const requestedUsd = requestedDiamonds * PAYOUT_USD_PER_DIAMOND;
  const invalidRequest =
    !Number.isInteger(requestedDiamonds) ||
    requestedDiamonds < MINIMUM_PAYOUT_DIAMONDS ||
    requestedDiamonds > Number(wallet.withdrawableBalance || 0) ||
    accountDetails.trim().length === 0;

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
            Creator Wallet & Balances
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live wallet balances and immutable transaction history from
            VoiceCloud.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<DollarSign size={18} />}
          onClick={() => setIsWithdrawOpen(true)}
        >
          Request Payout
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Diamond Balance
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                💎 {Number(wallet.diamondBalance).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Withdrawable Diamonds
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: 'success.main' }}
              >
                💎 {Number(wallet.withdrawableBalance || 0).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                $
                {(
                  Number(wallet.withdrawableBalance || 0) *
                  PAYOUT_USD_PER_DIAMOND
                ).toFixed(2)}{' '}
                USD at the accepted payout rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                Coin Balance
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, color: 'primary.main' }}
              >
                🪙 {Number(wallet.coinBalance).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Authoritative Payout Rules
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Minimum payout: {MINIMUM_PAYOUT_DIAMONDS.toLocaleString()} diamonds.
            The accepted settlement authority values one diamond at $
            {PAYOUT_USD_PER_DIAMOND.toFixed(3)} USD. Submitted funds are
            reserved immediately and cannot be spent twice while a payout is
            pending.
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Recent Wallet Ledger
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Currency</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      No wallet transactions recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.transactionType}</TableCell>
                      <TableCell>
                        {Number(tx.amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{tx.currency}</TableCell>
                      <TableCell>
                        <Chip size="small" label={tx.status} />
                      </TableCell>
                      <TableCell>{tx.referenceType || '—'}</TableCell>
                      <TableCell>
                        {new Date(tx.createdAt).toLocaleString()}
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
        open={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Request Earnings Payout</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {withdrawMutation.isError && (
              <Alert severity="error">{withdrawMutation.error.message}</Alert>
            )}
            <TextField
              label="Diamond Amount"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              helperText={`Estimated payout: $${requestedUsd.toFixed(2)} USD`}
              inputProps={{ min: MINIMUM_PAYOUT_DIAMONDS, step: 1 }}
              fullWidth
            />
            <TextField
              select
              label="Payout Method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              fullWidth
            >
              <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              <MenuItem value="PAYPAL">PayPal</MenuItem>
              <MenuItem value="STRIPE">Stripe</MenuItem>
              <MenuItem value="CRYPTO">Crypto</MenuItem>
            </TextField>
            <TextField
              label="Account / payout details"
              value={accountDetails}
              onChange={(event) => setAccountDetails(event.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsWithdrawOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={withdrawMutation.isPending || invalidRequest}
            onClick={() =>
              withdrawMutation.mutate({
                diamondAmount: requestedDiamonds,
                method,
                details: accountDetails.trim(),
              })
            }
          >
            {withdrawMutation.isPending ? 'Submitting…' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
