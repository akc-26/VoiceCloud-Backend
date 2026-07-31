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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
} from '@mui/material';
import { Wallet, DollarSign, ArrowUpRight, ArrowDownLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creatorApi } from '../services/creator-api.service';
import { useCreatorProfileStore } from '../store/creator-profile.store';
import { PageErrorState } from '../components/common/PageErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export const WalletPage: React.FC = () => {
  const queryClient = useQueryClient();
  const profile = useCreatorProfileStore((state) => state.profile);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('10000');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [accountDetails, setAccountDetails] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const walletQuery = useQuery({
    queryKey: ['creator', 'wallet'],
    queryFn: ({ signal }) => creatorApi.getWalletSummary(signal),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const withdrawMutation = useMutation({
    mutationFn: (vars: { diamondAmount: number; method: string; details: string }) =>
      creatorApi.submitPayoutRequest(vars.diamondAmount, vars.method, vars.details),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator', 'wallet'] });
      setWithdrawSuccess(true);
      setTimeout(() => {
        setWithdrawSuccess(false);
        setIsWithdrawOpen(false);
      }, 2000);
    },
  });

  if (walletQuery.isLoading) {
    return (
      <Box sx={{ p: 1 }}>
        <LoadingSkeleton type="card" count={2} />
      </Box>
    );
  }

  const walletData = walletQuery.data;
  const diamonds = walletData?.walletDiamonds ?? profile.walletDiamonds ?? 84300;
  const coins = walletData?.walletCoins ?? profile.walletCoins ?? 12500;
  const usdValue = (diamonds / 100).toFixed(2);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Creator Wallet & Balances
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View diamond gifts revenue, coin balances, exchange rates, and request earnings withdrawals.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<DollarSign size={18} />}
          onClick={() => setIsWithdrawOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Withdraw Diamonds
        </Button>
      </Box>

      {/* Main Balances */}
      <Grid container spacing={3}>
        <Grid xs={12} md={6}>
          <Card sx={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#ffffff' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                Diamond Revenue Balance
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, my: 1, color: '#ffffff' }}>
                💎 {diamonds.toLocaleString()}
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.95, color: '#ffffff' }}>
                Estimated USD Conversion: <strong>${usdValue} USD</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} md={6}>
          <Card sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                Virtual Coin Balance
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, my: 1, color: '#ffffff' }}>
                🪙 {coins.toLocaleString()}
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.95, color: '#ffffff' }}>
                Used for gifting, room boosts, and purchasing items in store.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Conversion Rules */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Exchange Rules & Payout Policy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            • <strong>Exchange Rate:</strong> 100 Diamonds = $1.00 USD.
            <br />
            • <strong>Minimum Withdrawal:</strong> 10,000 Diamonds ($100.00 USD).
            <br />
            • <strong>Processing Time:</strong> Bank transfer & PayPal requests process within 1-3 business days.
          </Typography>
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Request Earnings Withdrawal</DialogTitle>
        <DialogContent dividers>
          {withdrawSuccess ? (
            <Alert severity="success" icon={<CheckCircle2 size={20} />} sx={{ my: 2 }}>
              Withdrawal request submitted successfully!
            </Alert>
          ) : (
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField
                label="Diamond Amount to Withdraw"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                helperText={`Equivalent to $${(Number(amount || 0) / 100).toFixed(2)} USD`}
                fullWidth
              />
              <TextField
                select
                label="Payout Method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                fullWidth
              >
                <MenuItem value="BANK_TRANSFER">Direct Bank Transfer</MenuItem>
                <MenuItem value="PAYPAL">PayPal Express</MenuItem>
                <MenuItem value="STRIPE">Stripe Connect</MenuItem>
              </TextField>
              <TextField
                label="Account / IBAN / PayPal Email"
                placeholder="Enter details..."
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                fullWidth
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setIsWithdrawOpen(false)}>Cancel</Button>
          {!withdrawSuccess && (
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                withdrawMutation.mutate({
                  diamondAmount: Number(amount),
                  method,
                  details: accountDetails,
                });
              }}
              disabled={withdrawMutation.isPending || Number(amount) < 10000}
              sx={{ fontWeight: 700 }}
            >
              {withdrawMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
