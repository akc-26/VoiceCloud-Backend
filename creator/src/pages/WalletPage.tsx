import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import { Wallet, DollarSign, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { useCreatorProfileStore } from '../store/creator-profile.store';

export const WalletPage: React.FC = () => {
  const profile = useCreatorProfileStore((state) => state.profile);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Creator Wallet & Balances
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View diamond gifts revenue, coin balances, exchange rate rules, and withdrawal logs.
          </Typography>
        </Box>
        <Button variant="contained" color="success" startIcon={<DollarSign size={18} />}>
          Withdraw Diamonds
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid xs={12} md={6}>
          <Card sx={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#ffffff' }}>
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                Diamond Revenue Balance
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, my: 1, color: '#ffffff' }}>
                💎 {profile.walletDiamonds.toLocaleString()}
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.95, color: '#ffffff' }}>
                Estimated USD Conversion: <strong>${(profile.walletDiamonds / 100).toFixed(2)} USD</strong>
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
                🪙 {profile.walletCoins.toLocaleString()}
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.95, color: '#ffffff' }}>
                Used for gifting, room boosts, and purchasing items in store.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
