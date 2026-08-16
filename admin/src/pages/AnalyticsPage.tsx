import React, { useCallback, useEffect, useState } from 'react';
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import { adminService } from '../services/admin.service';
import { giftsAdminService, GiftRevenueSummary } from '../services/gifts.service';
import { ErrorState } from '../components/common/ErrorState';

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<GiftRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, giftRevenue] = await Promise.all([
        adminService.getDashboardStats(),
        giftsAdminService.getRevenue('weekly'),
      ]);
      setStats(dashboard);
      setRevenue(giftRevenue);
    } catch (requestError: any) {
      setStats(null);
      setRevenue(null);
      setError(requestError?.message || 'Platform analytics could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !stats) {
    return (
      <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !stats) {
    return <ErrorState title="Analytics unavailable" message={error} onRetry={() => void load()} />;
  }

  const overview = stats?.overview ?? {};
  const cards: Array<[string, number]> = [
    ['Registered Users', Number(overview?.users?.total ?? 0)],
    ['Total Rooms', Number(overview?.rooms?.total ?? 0)],
    ['Live Rooms', Number(overview?.rooms?.liveNow ?? 0)],
    ['Verified Hosts', Number(overview?.hosts?.totalVerified ?? 0)],
    ['Wallet Transactions', Number(overview?.wallet?.totalTransactions ?? 0)],
    ['Gift Transactions (weekly)', Number(revenue?.totalTransactions ?? 0)],
    ['Gift Coin Volume (weekly)', Number(revenue?.totalCoinsVolume ?? 0)],
    ['Platform Gift Revenue (weekly)', Number(revenue?.platformNetRevenue ?? 0)],
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Platform Analytics & Intelligence</Typography>
        <Typography color="text.secondary">
          Current persisted platform and monetization metrics. Values are never substituted with fabricated analytics when an API is unavailable.
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(4,1fr)' }, gap: 2 }}>
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="h4" fontWeight={800}>{value.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};
